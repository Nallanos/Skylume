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

            console.log(`📦 Envoi d'un batch de ${followersToAnalyze.length} followers pour l'analyse ${nextJob.analysisId} (job: ${nextJob.jobId})`)

            return response.json({
                status: 'success',
                data: {
                    jobId: nextJob.jobId,
                    analysisId: nextJob.analysisId,
                    accountId: nextJob.accountId,
                    accountHandle: account.handle,
                    accountAppPassword: account.appPassword,
                    followers: followersToAnalyze,
                    analysisType: 'bulk',
                    batchSize: followersToAnalyze.length
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

            // Récupérer les credentials du compte pour l'analyse récurrente
            const account = await Account.findByOrFail('handle', accountInfo.accountHandle)

            return response.json({
                status: 'success',
                data: {
                    jobId: hashId, // Utiliser le hashId comme jobId pour les analyses récurrentes
                    accountHandle: accountInfo.accountHandle,
                    accountAppPassword: account.appPassword, // Ajouter les credentials
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
            logger.info('Processing batch progress:', {
                contentType: request.header('content-type'),
                contentLength: request.header('content-length'),
                method: request.method(),
                url: request.url()
            })

            const contentType = request.header('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                logger.error('Invalid content type:', contentType)
                return response.status(400).json({
                    status: 'error',
                    message: 'Content-Type must be application/json'
                })
            }

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

                    // Log des nouvelles statistiques pour analyses récurrentes
                    if (results.clusterStats) {
                        console.log(`📊 Analyse récurrente - Total: ${results.clusterStats.totalClusters}, Sémantiques: ${results.clusterStats.semanticClusters}`)
                        console.log(`📈 Cohésion moyenne: ${results.clusterStats.averageCohesion}`)
                    }

                    if (results.analysisQuality) {
                        console.log(`🎯 Qualité récurrente - Valides: ${results.analysisQuality.validProfiles}/${results.analysisQuality.totalProfiles}, Poubelle: ${results.analysisQuality.trashProfiles}`)
                    }
                }
                console.log(`Analyse récurrente terminée pour le job ${jobId}`)
                await this.aiSchedulerService.updateBulkJobStatus(jobId, 'completed')
                return response.json({
                    status: 'success',
                    message: 'Analyse récurrente terminée',
                    stats: results?.clusterStats,
                    quality: results?.analysisQuality
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

            await this.aiSchedulerService.updateBulkJobStatus(jobId, 'completed')

            if (!results) {
                console.warn(`Batch ${jobId}: Aucun résultat reçu du worker Python`)
            } else if (!results.clustersData || results.clustersData.length === 0) {
                console.warn(`Batch ${jobId}: Résultats reçus mais aucun cluster généré`)
            } else {
                console.log(`Batch ${jobId}: ${results.clustersData.length} clusters reçus`)

                // Log des nouvelles statistiques complètes
                if (results.clusterStats) {
                    console.log(`📊 Statistiques clusters - Total: ${results.clusterStats.totalClusters}, Sémantiques: ${results.clusterStats.semanticClusters}, Bruit: ${results.clusterStats.noiseClusters}`)
                    console.log(`📈 Cohésion moyenne: ${results.clusterStats.averageCohesion}`)
                }

                if (results.analysisQuality) {
                    console.log(`🎯 Qualité analyse - Profils valides: ${results.analysisQuality.validProfiles}/${results.analysisQuality.totalProfiles}, Poubelle: ${results.analysisQuality.trashProfiles}`)
                    console.log(`📋 Couverture sémantique: ${results.analysisQuality.semanticCoverage}%`)
                }
            }

            // Calculer le progrès simplifié basé sur les clusters reçus
            const batchAccount = await Account.findOrFail(analysis.accountId)
            let clusterMembersTotal = 0

            if (results?.clustersData) {
                clusterMembersTotal = results.clustersData.reduce((sum: number, cluster: any) => {
                    return sum + (cluster.size || 0)
                }, 0)
            }

            // Calculer le pourcentage basé sur les membres des clusters vs followers à analyser
            const totalFollowers = batchAccount.numbersOfFollowersToAnalyze || 100
            const analyzedFollowers = batchAccount.numbersOfFollowersAnalyzed || 0
            const progressPercentage = Math.min(100, Math.round((analyzedFollowers / totalFollowers) * 100))

            // Mettre à jour le progrès simplifié
            await analysis.updateProgress({
                analyzed: clusterMembersTotal,
                total: totalFollowers,
                percentage: progressPercentage
            })

            // Stocker les résultats partiels avec toutes les nouvelles données
            if (results) {
                const currentResults = analysis.result || { batches: [], aggregatedStats: {} }
                if (!currentResults.batches) {
                    currentResults.batches = []
                }

                // Stocker le batch complet avec toutes les données
                const batchResult = {
                    clustersData: results.clustersData || [],
                    clusterStats: results.clusterStats,
                    clusterDetails: results.clusterDetails,
                    analysisQuality: results.analysisQuality,
                    tagsFrequency: results.tagsFrequency,
                    batchTimestamp: new Date().toISOString()
                }

                currentResults.batches.push(batchResult)

                // Agréger les statistiques globales
                if (results.clusterStats) {
                    if (!currentResults.aggregatedStats.totalClusters) {
                        currentResults.aggregatedStats = {
                            totalClusters: 0,
                            semanticClusters: 0,
                            noiseClusters: 0,
                            totalCohesion: 0,
                            batchCount: 0,
                            totalValidProfiles: 0,
                            totalProfiles: 0,
                            totalTrashProfiles: 0
                        }
                    }

                    currentResults.aggregatedStats.totalClusters += results.clusterStats.totalClusters || 0
                    currentResults.aggregatedStats.semanticClusters += results.clusterStats.semanticClusters || 0
                    currentResults.aggregatedStats.noiseClusters += results.clusterStats.noiseClusters || 0
                    currentResults.aggregatedStats.totalCohesion += results.clusterStats.averageCohesion || 0
                    currentResults.aggregatedStats.batchCount += 1

                    if (results.analysisQuality) {
                        currentResults.aggregatedStats.totalValidProfiles += results.analysisQuality.validProfiles || 0
                        currentResults.aggregatedStats.totalProfiles += results.analysisQuality.totalProfiles || 0
                        currentResults.aggregatedStats.totalTrashProfiles += results.analysisQuality.trashProfiles || 0
                    }
                }

                analysis.result = currentResults
                await analysis.save()

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
                console.log(`✅ Analyse complète terminée pour ${analysis.id}, création des clusters finaux...`)

                // Récupérer le compte pour créer les clusters
                const account = await Account.findOrFail(analysis.accountId)

                // Agréger tous les résultats des batches pour créer les clusters
                await this.createClustersFromBatchResults(analysis, account)

                // Calculer les statistiques finales
                const finalStats = analysis.result?.aggregatedStats
                let completionData: any = {
                    totalBatches: (analysis.result?.batches || []).length,
                    totalAnalyzed: clusterMembersTotal,
                    processedAt: DateTime.now().toISO()
                }

                if (finalStats && finalStats.batchCount > 0) {
                    completionData = {
                        ...completionData,
                        finalStats: {
                            totalClusters: finalStats.totalClusters,
                            semanticClusters: finalStats.semanticClusters,
                            noiseClusters: finalStats.noiseClusters,
                            averageCohesion: finalStats.totalCohesion / finalStats.batchCount,
                            totalValidProfiles: finalStats.totalValidProfiles,
                            totalProfiles: finalStats.totalProfiles,
                            totalTrashProfiles: finalStats.totalTrashProfiles,
                            semanticCoverage: finalStats.totalProfiles > 0 ?
                                (finalStats.totalValidProfiles / finalStats.totalProfiles * 100).toFixed(2) : 0
                        }
                    }

                    console.log(`📊 Statistiques finales pour l'analyse ${analysis.id}:`, completionData.finalStats)
                }

                await analysis.markAsCompleted(completionData)

                return response.json({
                    status: 'completed',
                    message: 'Analyse terminée avec succès',
                    totalAnalyzed: clusterMembersTotal,
                    finalStats: completionData.finalStats
                })
            }

            // Mettre à jour le cursor pour le prochain batch
            await this.followerBatchService.updateAnalysisCursor(analysis, nextBatch.newCursor)

            // Calculer la priorité pour le prochain batch
            const priorityAccount = await Account.findOrFail(analysis.accountId)
            await priorityAccount.load('user')

            const priority = this.calculateBatchPriority(
                priorityAccount.user.plan,
                clusterMembersTotal
            )

            // Ajouter le prochain batch à la queue
            const nextJobId = await this.aiSchedulerService.addBulkAnalysisToQueue(
                analysis.id,
                analysis.accountId,
                nextBatch.followers,
                priority
            )

            console.log(`📦 Prochain batch de ${nextBatch.followers.length} followers mis en queue (job: ${nextJobId}) - Progrès: ${progressPercentage}%`)

            return response.json({
                status: 'next_batch_queued',
                message: `Batch de ${clusterMembersTotal} followers traité, prochain batch de ${nextBatch.followers.length} followers mis en queue`,
                nextJobId,
                progress: {
                    analyzed: clusterMembersTotal,
                    total: totalFollowers,
                    percentage: progressPercentage
                },
                nextBatchSize: nextBatch.followers.length,
                batchSize: 200
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
     * Met à jour le progrès d'une analyse en cours (simplifié)
     */
    public async updateAnalysisProgress({ request, response }: HttpContext) {
        try {
            const { analysisId, analyzed, percentage, total, step, message } = request.only([
                'analysisId', 'analyzed', 'percentage', 'total', 'step', 'message'
            ])

            if (!analysisId) {
                return response.status(400).json({
                    status: 'error',
                    message: 'analysisId est requis'
                })
            }

            const numericAnalysisId = parseInt(analysisId, 10)
            if (isNaN(numericAnalysisId)) {
                return response.status(400).json({
                    status: 'error',
                    message: 'analysisId doit être un nombre valide'
                })
            }

            const analysis = await AnalysisAudience.find(numericAnalysisId)
            if (!analysis) {
                return response.status(404).json({
                    status: 'error',
                    message: 'Analyse non trouvée'
                })
            }

            // Progrès simplifié : juste mettre à jour le pourcentage et le statut
            if (percentage !== undefined) {
                analysis.progress = {
                    analyzed: analyzed || 0,
                    total: total || 100,
                    percentage: Math.min(100, Math.max(0, percentage))
                }
            }

            // Mettre à jour le statut si fourni
            if (step) {
                if (step === 'completed') {
                    analysis.status = 'completed'
                    analysis.completedAt = DateTime.now()
                } else if (step === 'failed') {
                    analysis.status = 'failed'
                    analysis.errorMessage = message || 'Erreur lors du traitement'
                } else if (step === 'starting' || step === 'processing') {
                    analysis.status = 'in_progress'
                }
            }

            await analysis.save()

            return response.json({
                status: 'success',
                message: 'Progrès mis à jour',
                progress: analysis.progress
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

            // Agréger tous les clusters de tous les batches avec les nouvelles données
            const allClusters: any[] = []
            const aggregatedTagsFrequency: Record<string, number> = {}
            let totalTrashProfiles = 0

            for (const batch of batches) {
                if (batch.clustersData && Array.isArray(batch.clustersData)) {
                    allClusters.push(...batch.clustersData)
                }

                // Agréger les fréquences de tags
                if (batch.tagsFrequency) {
                    for (const [tag, count] of Object.entries(batch.tagsFrequency)) {
                        aggregatedTagsFrequency[tag] = (aggregatedTagsFrequency[tag] || 0) + (count as number)
                    }
                }

                // Compter les profils poubelle
                if (batch.analysisQuality?.trashProfiles) {
                    totalTrashProfiles += batch.analysisQuality.trashProfiles
                }
            }

            if (allClusters.length === 0) {
                console.log(`Aucun cluster trouvé dans les résultats de l'analyse ${analysis.id}`)
                return
            }

            console.log(`Création de ${allClusters.length} clusters pour le compte ${account.handle}`)
            console.log(`📊 Tags les plus fréquents:`, Object.entries(aggregatedTagsFrequency)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10))
            console.log(`🗑️ Total profils poubelle: ${totalTrashProfiles}`)

            // Utiliser FollowerAnalysisService pour créer les clusters
            // Mais d'abord, nous devons adapter les données au format attendu
            const clustersData = allClusters.map(cluster => {
                console.log(`DEBUG: Processing cluster from batch results:`, {
                    tag: cluster.tag,
                    size: cluster.size,
                    cohesion: cluster.cohesion,
                    persistence: cluster.persistence
                })

                const result = {
                    tag: cluster.tag || 'Unknown',
                    handles: cluster.handles || [],
                    keywords: cluster.keywords || [],
                    embedding: cluster.embedding || cluster.embeddings || [], // Fixed: Use singular 'embedding' key consistently
                    size: cluster.size || 0,
                    cohesion: cluster.cohesion !== undefined ? cluster.cohesion : null,
                    persistence: cluster.persistence !== undefined ? cluster.persistence : null
                }

                console.log(`DEBUG: Mapped cluster data from batch:`, result)
                return result
            })

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

            console.log(`Création incrémentale de ${JSON.stringify(batchResults.clustersData)} clusters pour l'analyse ${analysis.id}`)
            const clustersData = batchResults.clustersData.map((cluster: any) => {
                console.log(`DEBUG: Processing cluster from Python:`, {
                    tag: cluster.tag,
                    size: cluster.size,
                    cohesion: cluster.cohesion,
                    persistence: cluster.persistence
                })

                const result = {
                    tag: cluster.tag || 'Unknown',
                    handles: cluster.handles || [],
                    keywords: cluster.keywords || [],
                    embedding: cluster.centroid || cluster.embedding || cluster.embeddings || [],
                    size: cluster.size || 0,
                    cohesion: cluster.cohesion !== undefined ? cluster.cohesion : null,
                    persistence: cluster.persistence !== undefined ? cluster.persistence : null
                }

                console.log(`DEBUG: Mapped cluster data:`, result)
                return result
            })

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
                    blueskyHandle: account.handle, // Le handle Bluesky est le même que le handle du compte
                    blueskyPassword: account.appPassword // Le mot de passe Bluesky est stocké dans appPassword
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
