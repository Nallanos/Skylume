import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import { AiSchedulerService } from '#services/ai_scheduler_service'
import FollowerBatchService from '#services/follower_batch_service'
import { DateTime } from 'luxon'

@inject()
export default class PythonControllerMethods {
    constructor(
        protected aiSchedulerService: AiSchedulerService,
        protected followerBatchService: FollowerBatchService
    ) { }

    /**
     * Récupère le prochain job d'analyse d'audience prioritaire pour le worker Python
     * Cette méthode est appelée par le worker Python via polling HTTP
     */
    public async getNextBulkAnalysisJob({ response }: HttpContext) {
        try {
            // Récupérer le job le plus prioritaire depuis Redis
            const nextJob = await this.aiSchedulerService.getNextBulkAnalysisJob()

            if (!nextJob) {
                return response.status(204).json({
                    status: 'no_job',
                    message: 'Aucun job en attente'
                })
            }

            // Récupérer les informations du compte depuis la base de données
            const account = await Account.query()
                .where('id', nextJob.accountId)
                .preload('user')
                .first()

            if (!account) {
                console.error(`Compte non trouvé pour l'analyse ${nextJob.analysisId}`)
                // Marquer le job comme échoué
                await this.aiSchedulerService.updateBulkJobStatus(
                    nextJob.jobId,
                    'failed',
                    'Compte non trouvé'
                )
                return response.status(404).json({
                    status: 'error',
                    message: 'Compte non trouvé'
                })
            }

            // Marquer l'analyse comme "en cours" dans la base de données
            const analysis = await AnalysisAudience.find(nextJob.analysisId)
            if (analysis) {
                analysis.status = 'in_progress'
                analysis.startedAt = DateTime.now()
                await analysis.save()
            }

            // Les followers sont déjà récupérés depuis Redis dans nextJob
            const followersToAnalyze = nextJob.followers

            return response.json({
                status: 'success',
                data: {
                    jobId: nextJob.jobId,
                    analysisId: nextJob.analysisId,
                    accountId: nextJob.accountId,
                    accountHandle: account.handle,
                    followers: followersToAnalyze,
                    analysisType: 'bulk'
                }
            })

        } catch (error) {
            console.error("Erreur lors de la récupération du prochain job:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
            })
        }
    }

    /**
     * Récupère le prochain job d'analyse récurrente pour le worker Python
     * Ces analyses sont déclenchées automatiquement par le firehose et ne sont pas stockées en BDD
     */
    public async getNextRecurringAnalysisJob({ response }: HttpContext) {
        try {
            // Récupérer le compte le plus prioritaire depuis la queue récurrente
            const highestPriorityAccounts = await this.aiSchedulerService.getHighestPriorityRecurringAccounts(1)

            if (highestPriorityAccounts.length === 0) {
                return response.status(204).json({
                    status: 'no_job',
                    message: 'Aucun job récurrent en attente'
                })
            }

            const hashId = highestPriorityAccounts[0]
            const accountInfo = await this.aiSchedulerService.getAccountInfo(hashId)

            if (!accountInfo) {
                // Nettoyer le hash ID invalide
                await this.aiSchedulerService.removeRecurringAccount(hashId)
                return response.status(204).json({
                    status: 'no_job',
                    message: 'Aucun job récurrent valide en attente'
                })
            }

            // Supprimer de la queue pour éviter le double traitement
            await this.aiSchedulerService.removeRecurringAccount(hashId)

            // Récupérer les followers récents (100 followers comme configuré dans le firehose)
            const followersToAnalyze = await this.getFollowersForAnalysis(accountInfo.accountHandle, accountInfo.followersCount)

            return response.json({
                status: 'success',
                data: {
                    jobId: hashId, // Utiliser le hashId comme jobId pour les analyses récurrentes
                    accountHandle: accountInfo.accountHandle,
                    followers: followersToAnalyze,
                    analysisType: 'recurring' // Distinguer du type bulk
                }
            })

        } catch (error) {
            console.error("Erreur lors de la récupération du prochain job récurrent:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
            })
        }
    }

    /**
     * Traite le progrès d'un batch d'analyse et gère la suite du processus
     * Cette méthode remplace completeAnalysisJob pour gérer les analyses par batches
     */
    public async processBatchProgress({ request, response }: HttpContext) {
        try {
            const { jobId, analysisId, success, results, error } = request.only([
                'jobId', 'analysisId', 'success', 'results', 'error'
            ])

            if (!jobId) {
                return response.status(400).json({
                    status: 'error',
                    message: 'jobId est requis'
                })
            }

            // Si pas d'analysisId, c'est une analyse récurrente (on fait juste du logging)
            if (!analysisId) {
                console.log(`Analyse récurrente terminée pour le job ${jobId}`)
                await this.aiSchedulerService.updateBulkJobStatus(jobId, 'completed')
                return response.json({
                    status: 'success',
                    message: 'Analyse récurrente terminée'
                })
            }

            // Pour les analyses en bulk, récupérer l'analyse depuis la DB
            const analysis = await AnalysisAudience.find(analysisId)
            if (!analysis) {
                return response.status(404).json({
                    status: 'error',
                    message: 'Analyse non trouvée'
                })
            }

            if (!success) {
                // Marquer le job comme échoué
                await this.aiSchedulerService.updateBulkJobStatus(jobId, 'failed', error)
                await analysis.markAsFailed(error || 'Erreur lors du traitement du batch')

                return response.json({
                    status: 'success',
                    message: 'Analyse marquée comme échouée'
                })
            }

            // Batch traité avec succès - marquer le job comme terminé
            await this.aiSchedulerService.updateBulkJobStatus(jobId, 'completed')

            // Mettre à jour le progrès
            const currentProgress = analysis.progress || { analyzed: 0, total: 0, percentage: 0 }
            const processedInThisBatch = results?.totalAnalyzed || 0
            const analyzedCount = currentProgress.analyzed + processedInThisBatch

            // Calculer le total estimé - essayer de récupérer le vrai count si nécessaire
            let totalEstimated = this.followerBatchService.getEstimatedTotalFollowers(
                await Account.findOrFail(analysis.accountId)
            )

            // Si le total estimé est 0 ou très faible, essayer de récupérer le vrai count via l'API
            if (totalEstimated <= 0) {
                try {
                    console.log(`Total estimé invalide (${totalEstimated}) pour l'analyse ${analysis.id}, récupération via API...`)
                    const account = await Account.findOrFail(analysis.accountId)
                    const accountService = await this.followerBatchService['accountManager'].getOrCreateAccountService(account)
                    const realFollowerCount = await accountService.getFollowersCount(account)
                    if (realFollowerCount > 0) {
                        totalEstimated = realFollowerCount
                        console.log(`Total corrigé pour l'analyse ${analysis.id}: ${totalEstimated} followers`)
                    } else {
                        // Fallback sur le nombre analysé + une marge raisonnable
                        totalEstimated = Math.max(analyzedCount + 100, 100)
                        console.log(`Fallback appliqué pour l'analyse ${analysis.id}: ${totalEstimated} followers`)
                    }
                } catch (error) {
                    console.error(`Erreur lors de la récupération du count réel pour l'analyse ${analysis.id}:`, error)
                    // Fallback sur le nombre analysé + une marge raisonnable
                    totalEstimated = Math.max(analyzedCount + 100, 100)
                }
            }

            // Mettre à jour le progrès de l'analyse
            const newProgress = {
                analyzed: analyzedCount,
                total: Math.max(totalEstimated, analyzedCount),
                percentage: totalEstimated > 0 ? Math.round((analyzedCount / totalEstimated) * 100) : 0
            }

            await analysis.updateProgress(newProgress)

            // Stocker les résultats partiels
            if (results) {
                const currentResults = analysis.result || { batches: [] }
                if (!currentResults.batches) {
                    currentResults.batches = []
                }
                currentResults.batches.push(results)
                analysis.result = currentResults
                await analysis.save()
            }

            // Récupérer le prochain batch de followers
            const nextBatch = await this.followerBatchService.getNextFollowersBatch(analysis)

            if (!nextBatch || nextBatch.followers.length === 0) {
                // Plus de followers à analyser - terminer l'analyse
                await analysis.markAsCompleted({
                    totalBatches: (analysis.result?.batches || []).length,
                    totalAnalyzed: analyzedCount,
                    processedAt: DateTime.now().toISO()
                })

                return response.json({
                    status: 'completed',
                    message: 'Analyse terminée avec succès',
                    totalAnalyzed: analyzedCount
                })
            }

            // Mettre à jour le cursor pour le prochain batch
            await this.followerBatchService.updateAnalysisCursor(analysis, nextBatch.newCursor)

            // Calculer la priorité pour le prochain batch
            const account = await Account.findOrFail(analysis.accountId)
            await account.load('user')

            const priority = this.calculateBatchPriority(
                account.user.plan,
                analyzedCount
            )

            // Ajouter le prochain batch à la queue
            const nextJobId = await this.aiSchedulerService.addBulkAnalysisToQueue(
                analysis.id,
                analysis.accountId,
                nextBatch.followers,
                priority
            )

            return response.json({
                status: 'next_batch_queued',
                message: 'Batch traité, prochain batch mis en queue',
                nextJobId,
                progress: newProgress,
                nextBatchSize: nextBatch.followers.length
            })

        } catch (error) {
            console.error("Erreur lors du traitement du progrès du batch:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
            })
        }
    }

    /**
     * Calcule la priorité pour le prochain batch
     */
    private calculateBatchPriority(userPlan: string, alreadyAnalyzed: number): number {
        let basePriority = 50 // Priorité par défaut

        // Priorité selon le plan
        switch (userPlan) {
            case 'pro':
                basePriority = 100
                break
            case 'premium':
                basePriority = 80
                break
            default:
                basePriority = 50
        }

        // Réduire légèrement la priorité au fur et à mesure que l'analyse progresse
        // pour donner une chance aux nouvelles analyses
        const progressPenalty = Math.floor(alreadyAnalyzed / 1000) * 5

        return Math.max(basePriority - progressPenalty, 10)
    }

    /**
     * Met à jour le progrès d'une analyse en cours
     */
    public async updateAnalysisProgress({ request, response }: HttpContext) {
        try {
            const { analysisId, analyzed, percentage } = request.only([
                'analysisId', 'analyzed', 'percentage'
            ])

            if (!analysisId) {
                return response.status(400).json({
                    status: 'error',
                    message: 'analysisId est requis'
                })
            }

            // Validate analysisId is a number
            const numericAnalysisId = parseInt(analysisId, 10)
            if (isNaN(numericAnalysisId)) {
                return response.status(400).json({
                    status: 'error',
                    message: 'analysisId doit être un nombre valide'
                })
            }

            // Récupérer l'analyse depuis la base de données
            const analysis = await AnalysisAudience.find(numericAnalysisId)
            if (!analysis) {
                return response.status(404).json({
                    status: 'error',
                    message: 'Analyse non trouvée'
                })
            }

            // Mettre à jour le progrès
            // Note: Ne pas écraser le 'total' car il vient du batch (len(followers)) 
            // et ne représente pas le total réel de followers du compte.
            // Le vrai total est calculé dans processBatchProgress via getEstimatedTotalFollowers.
            const currentProgress = analysis.progress || { analyzed: 0, total: 0, percentage: 0 }

            analysis.progress = {
                analyzed: analyzed || 0,
                total: currentProgress.total || 0, // Garder le total existant, ne pas l'écraser
                percentage: percentage || 0
            }
            await analysis.save()

            return response.json({
                status: 'success',
                message: 'Progrès mis à jour'
            })

        } catch (error) {
            console.error("Erreur lors de la mise à jour du progrès:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`
            })
        }
    }

    /**
     * Récupère les followers à analyser pour un compte donné
     * Cette méthode est utilisée pour les analyses récurrentes qui utilisent l'AccountService
     */
    private async getFollowersForAnalysis(accountHandle: string, followersCount: number): Promise<any[]> {
        try {
            console.log(`Récupération des followers pour ${accountHandle} (${followersCount} followers estimés)`)

            // Pour les analyses récurrentes, il faut récupérer le compte et utiliser AccountService
            const account = await Account.query().where('handle', accountHandle).first()

            if (!account) {
                console.warn(`Compte non trouvé pour le handle ${accountHandle}`)
                return []
            }

            // Obtenir l'AccountService via AccountManager  
            const accountService = await this.followerBatchService['accountManager'].getOrCreateAccountService(account)

            // Récupérer les 100 premiers followers (sans cursor pour commencer du début)
            const followersData = await accountService.getFollowers(account, accountHandle)

            const followers = followersData?.followers || []
            console.log(`Followers récupérés: ${followers.length}`)
            return followers.slice(0, 100) // Limiter à 100

        } catch (error) {
            console.error(`Erreur lors de la récupération des followers pour ${accountHandle}:`, error)
            return []
        }
    }
}
