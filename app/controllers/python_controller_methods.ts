import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import { AiSchedulerService } from '#services/ai_scheduler_service'
import FollowerBatchService from '#services/follower_batch_service'
import FollowerAnalysisService from '#services/follower_analysis_service'
import { DateTime } from 'luxon'

@inject()
export default class PythonControllerMethods {
    constructor(
        protected aiSchedulerService: AiSchedulerService,
        protected followerBatchService: FollowerBatchService,
        protected followerAnalysisService: FollowerAnalysisService
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
    public async processBatchProgress({ request, response, logger }: HttpContext) {
        try {
            // Log request details for debugging
            logger.info('Processing batch progress:', {
                contentType: request.header('content-type'),
                contentLength: request.header('content-length'),
                method: request.method(),
                url: request.url()
            })

            // Validate content type
            const contentType = request.header('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                logger.error('Invalid content type:', contentType)
                return response.status(400).json({
                    status: 'error',
                    message: 'Content-Type must be application/json'
                })
            }

            // Try to extract data with proper error handling
            let requestData
            try {
                requestData = request.only([
                    'jobId', 'analysisId', 'success', 'results', 'error'
                ])
            } catch (parseError) {
                logger.error('Failed to parse request body:', {
                    error: parseError.message,
                    raw: request.raw()?.substring(0, 1000)
                })
                return response.status(400).json({
                    status: 'error',
                    message: 'Invalid JSON format in request body'
                })
            }

            const { jobId, analysisId, success, results, error } = requestData


            if (!jobId) {
                return response.status(400).json({
                    status: 'error',
                    message: 'jobId est requis'
                })
            }

            // Si pas d'analysisId, c'est une analyse récurrente (on fait juste du logging)
            if (!analysisId) {
                if (!results || !results.clustersData || results.clustersData.length === 0) {
                    console.warn(`Analyse récurrente ${jobId}: Aucun résultat ou clusters vides`)
                } else {
                    console.log(`Analyse récurrente ${jobId}: ${results.clustersData.length} clusters traités`)
                }
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
                console.error(`Batch ${jobId} échoué pour l'analyse ${analysisId}: ${error}`)
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

            // Log des résultats reçus pour debugging
            if (!results) {
                console.warn(`Batch ${jobId}: Aucun résultat reçu du worker Python`)
            } else if (!results.clustersData || results.clustersData.length === 0) {
                console.warn(`Batch ${jobId}: Résultats reçus mais aucun cluster généré (totalAnalyzed: ${results.totalAnalyzed || 0})`)
            } else {
                console.log(`Batch ${jobId}: ${results.clustersData.length} clusters reçus, ${results.totalAnalyzed || 0} followers analysés`)
            }

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

                // CRÉATION INCRÉMENTALE DES CLUSTERS - Interface plus responsive
                if (results.clustersData && results.clustersData.length > 0) {
                    try {
                        console.log(`Création incrémentale de ${results.clustersData.length} clusters pour l'analyse ${analysis.id}`)
                        const account = await Account.findOrFail(analysis.accountId)

                        // Créer les clusters immédiatement pour ce batch
                        await this.createClustersFromSingleBatch(analysis, account, results)

                        console.log(`${results.clustersData.length} clusters créés avec succès pour le batch ${jobId}`)
                    } catch (error) {
                        console.error(`Erreur lors de la création incrémentale des clusters pour le batch ${jobId}:`, error)
                        // Ne pas bloquer le processus en cas d'erreur de cluster
                    }
                } else {
                    console.warn(`Batch ${jobId}: Aucun cluster à créer pour ce batch`)
                }
            } else {
                console.warn(`Batch ${jobId}: Aucun résultat à stocker pour ce batch`)
            }

            // Récupérer le prochain batch de followers
            const nextBatch = await this.followerBatchService.getNextFollowersBatch(analysis)

            if (!nextBatch || nextBatch.followers.length === 0) {
                // Plus de followers à analyser - terminer l'analyse
                console.log(`Analyse terminée pour ${analysis.id}, création des clusters...`)

                // Récupérer le compte pour créer les clusters
                const account = await Account.findOrFail(analysis.accountId)

                // Agréger tous les résultats des batches pour créer les clusters
                await this.createClustersFromBatchResults(analysis, account)

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

            // Enhanced error logging for debugging
            logger.error('Detailed error in processBatchProgress:', {
                error: error.message,
                stack: error.stack,
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                contentType: request.header('content-type'),
                contentLength: request.header('content-length'),
                rawBodyPreview: request.raw()?.substring(0, 1000)
            })

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
    public async updateAnalysisProgress({ request, response, logger }: HttpContext) {
        try {
            // Log request details for debugging
            logger.info('Updating analysis progress:', {
                contentType: request.header('content-type'),
                contentLength: request.header('content-length'),
                url: request.url()
            })

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

            // Enhanced error logging for debugging
            logger.error('Detailed error in updateAnalysisProgress:', {
                error: error.message,
                stack: error.stack,
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                contentType: request.header('content-type'),
                contentLength: request.header('content-length'),
                rawBodyPreview: request.raw()?.substring(0, 1000)
            })

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

    /**
     * Crée les clusters et superclusters dans la base de données à partir des résultats agrégés
     */
    private async createClustersFromBatchResults(analysis: AnalysisAudience, account: Account): Promise<void> {
        try {
            const batches = analysis.result?.batches || []
            if (batches.length === 0) {
                console.log(`Aucun batch de résultats trouvé pour l'analyse ${analysis.id}`)
                return
            }

            // Agréger tous les clusters de tous les batches
            const allClusters: any[] = []
            for (const batch of batches) {
                if (batch.clustersData && Array.isArray(batch.clustersData)) {
                    allClusters.push(...batch.clustersData)
                }
            }

            if (allClusters.length === 0) {
                console.log(`Aucun cluster trouvé dans les résultats de l'analyse ${analysis.id}`)
                return
            }

            console.log(`Création de ${allClusters.length} clusters pour le compte ${account.handle}`)

            // Utiliser FollowerAnalysisService pour créer les clusters
            // Mais d'abord, nous devons adapter les données au format attendu
            const clustersData = allClusters.map(cluster => ({
                tag: cluster.tag || 'Unknown',
                handles: cluster.handles || [],
                keywords: cluster.keywords || [],
                embedding: cluster.embeddings || cluster.embedding || [], // Fix: Python uses 'embeddings' (plural)
                size: cluster.size || 0,
                cohesion: cluster.cohesion || 0
            }))

            // Créer les clusters via le service
            await this.followerAnalysisService.createClustersFromData(account, clustersData)

            console.log(`Clusters créés avec succès pour l'analyse ${analysis.id}`)

        } catch (error) {
            console.error(`Erreur lors de la création des clusters pour l'analyse ${analysis.id}:`, error)
            // Ne pas faire échouer l'analyse si la création des clusters échoue
        }
    }

    /**
     * Crée les clusters et superclusters dans la base de données à partir d'un seul batch
     * Cette méthode permet une création incrémentale pour une interface plus responsive
     */
    private async createClustersFromSingleBatch(analysis: AnalysisAudience, account: Account, batchResults: any): Promise<void> {
        try {
            if (!batchResults.clustersData || !Array.isArray(batchResults.clustersData)) {
                console.log(`Aucune donnée de cluster dans le batch pour l'analyse ${analysis.id}`)
                return
            }

            const clustersData = batchResults.clustersData.map((cluster: any) => ({
                tag: cluster.tag || 'Unknown',
                handles: cluster.handles || [],
                keywords: cluster.keywords || [],
                embedding: cluster.embeddings || cluster.embedding || [], // Fix: Python uses 'embeddings' (plural)
                size: cluster.size || 0,
                cohesion: cluster.cohesion || 0
            }))

            // Créer les clusters immédiatement via le service
            await this.followerAnalysisService.createClustersFromData(account, clustersData)

            console.log(`Création incrémentale réussie: ${clustersData.length} clusters créés pour l'analyse ${analysis.id}`)

        } catch (error) {
            console.error(`Erreur lors de la création incrémentale des clusters pour l'analyse ${analysis.id}:`, error)
            // Ne pas faire échouer l'analyse si la création des clusters échoue
        }
    }

    /**
     * Récupère les données d'un compte pour le service Python
     * Cette méthode est utilisée par le service Python pour obtenir les credentials d'un compte
     */
    public async getAccount({ params, response }: HttpContext) {
        try {
            const { handle } = params

            if (!handle) {
                return response.status(400).json({
                    status: 'error',
                    message: 'Handle du compte requis'
                })
            }

            // Récupérer le compte avec ses données sensibles
            const account = await Account.findByOrFail('handle', handle)

            // Retourner uniquement les données nécessaires pour le service Python
            return response.json({
                status: 'success',
                account: {
                    id: account.id,
                    handle: account.handle,
                    app_password: account.appPassword
                }
            })

        } catch (error) {
            console.error(`Erreur lors de la récupération du compte ${params.handle}:`, error)

            if (error.code === 'E_ROW_NOT_FOUND') {
                return response.status(404).json({
                    status: 'error',
                    message: 'Compte non trouvé'
                })
            }

            return response.status(500).json({
                status: 'error',
                message: `Erreur serveur: ${error instanceof Error ? error.message : String(error)}`
            })
        }
    }

    /**
     * Endpoint de santé pour vérifier la connectivité avec l'API AdonisJS
     */
    public async health({ response }: HttpContext) {
        return response.json({
            status: 'success',
            message: 'AdonisJS API is healthy',
            timestamp: new Date().toISOString()
        })
    }
}
