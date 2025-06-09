import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import Cluster from '#models/cluster'
import SuperCluster from '#models/superCluster'
import { AiSchedulerService } from '../services/ai_scheduler_service.js'
import FollowerBatchService from '../services/follower_batch_service.js'
import { sseService } from '#services/sse_service'

@inject()
export default class FollowerAnalysisController {
    constructor(
        protected aiSchedulerService: AiSchedulerService,
        protected followerBatchService: FollowerBatchService
    ) { }

    /**
     * Démarre l'analyse des followers pour un compte spécifique
     * Utilise uniquement la queue Redis pour une architecture cohérente
     */
    public async startAnalysis({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({
                    status: 'error',
                    message: 'Non autorisé'
                })
            }

            const accountId = params.id

            // Récupérer le compte avec findOrFail selon les bonnes pratiques
            const account = await Account.query()
                .where('id', accountId)
                .andWhere('user_id', user.id)
                .preload('user')
                .firstOrFail()

            // Vérifier si une analyse est déjà en cours ou en attente
            const existingAnalysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .whereIn('status', ['pending', 'in_progress'])
                .first()

            if (existingAnalysis) {
                // Vérifier si l'analyse est vraiment en cours dans Redis
                const isActiveInQueue = await this.aiSchedulerService.isBulkAnalysisActiveInQueue(existingAnalysis.id)

                if (isActiveInQueue) {
                    // L'analyse est vraiment en cours
                    return response.status(409).json({
                        status: 'error',
                        message: 'Une analyse est déjà en cours pour ce compte',
                        analysisId: existingAnalysis.id
                    })
                } else {
                    // L'analyse est marquée comme en cours en DB mais n'existe plus dans Redis
                    // Probablement due à un crash de Redis, on peut relancer
                    console.log(`Analysis ${existingAnalysis.id} marked as in progress in DB but not found in Redis queue. Allowing restart.`)

                    // Marquer l'ancienne analyse comme échouée
                    existingAnalysis.status = 'failed'
                    existingAnalysis.errorMessage = 'Analysis was interrupted (Redis queue lost)'
                    await existingAnalysis.save()
                }
            }

            // Créer l'enregistrement d'analyse en BDD
            const estimatedTotal = this.followerBatchService.getEstimatedTotalFollowers(account)
            const analysis = await AnalysisAudience.create({
                accountId: account.id,
                accountHandle: account.handle, // Ajouter le handle Bluesky
                status: 'pending',
                progress: {
                    analyzed: 0,
                    total: estimatedTotal,
                    percentage: 0
                },
                followersCursor: null // Commencer du début
            })

            // Récupérer le premier batch de followers
            const firstBatch = await this.followerBatchService.getNextFollowersBatch(analysis)

            if (!firstBatch || firstBatch.followers.length === 0) {
                // Aucun follower à analyser
                await analysis.markAsCompleted({ message: 'Aucun follower à analyser' })
                return response.json({
                    status: 'success',
                    message: 'Aucun follower trouvé pour ce compte',
                    analysisId: analysis.id
                })
            }

            // Mettre à jour le cursor après avoir récupéré le premier batch
            await this.followerBatchService.updateAnalysisCursor(analysis, firstBatch.newCursor)

            // Calculer la priorité en fonction du plan et des métriques de followers
            const priority = this.calculateBulkAnalysisPriority(
                account.user.plan,
                account.followersCount || 0,
                account.numbersOfFollowersAnalyzed || 0
            )

            // Ajouter le premier batch à la queue Redis
            const queueJobId = await this.aiSchedulerService.addBulkAnalysisToQueue(
                analysis.id,
                account.id,
                firstBatch.followers,
                priority
            )

            // Mettre à jour l'analyse avec l'ID du job et marquer comme démarrée
            await analysis.markAsStarted(queueJobId)

            return response.status(202).json({
                status: 'success',
                message: `Analyse des followers démarrée pour le compte ${account.handle}`,
                analysisId: analysis.id,
                queueJobId,
                firstBatchSize: firstBatch.followers.length,
                estimatedTotal: estimatedTotal
            })
        } catch (error) {
            console.error("Erreur lors du démarrage de l'analyse des followers:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error.message}`
            })
        }
    }

    /**
     * Arrête une analyse en cours
     */
    public async stopAnalysis({ params, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({
                    status: 'error',
                    message: 'Non autorisé'
                })
            }

            const accountId = params.id

            // Vérifier que l'utilisateur est propriétaire du compte
            const account = await Account.query()
                .where('id', accountId)
                .andWhere('user_id', user.id)
                .firstOrFail()

            // Récupérer l'analyse en cours
            const analysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .whereIn('status', ['pending', 'in_progress'])
                .first()

            if (!analysis) {
                return response.status(404).json({
                    status: 'error',
                    message: 'Aucune analyse en cours pour ce compte'
                })
            }

            // Annuler le job dans Redis si il existe
            if (analysis.queueJobId) {
                await this.aiSchedulerService.cancelBulkAnalysisJob(analysis.queueJobId)
            }

            // Marquer l'analyse comme arrêtée
            await analysis.markAsStopped()

            return response.json({
                status: 'success',
                message: `Analyse des followers arrêtée pour le compte ${account.handle}`,
                analysisId: analysis.id
            })
        } catch (error) {
            console.error("Erreur lors de l'arrêt de l'analyse des followers:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error.message}`
            })
        }
    }

    /**
     * Récupère le statut d'une analyse (optimisé pour le polling via Inertia)
     */
    public async getAnalysisStatus({ params, inertia, auth }: HttpContext) {
        const user = await auth.authenticate()
        const accountId = params.id

        // Vérifier que l'utilisateur est propriétaire du compte
        const account = await Account.query()
            .where('id', accountId)
            .andWhere('user_id', user.id)
            .firstOrFail()

        // Récupérer l'analyse d'audience la plus récente
        const currentAnalysis = await AnalysisAudience.query()
            .where('account_id', accountId)
            .orderBy('created_at', 'desc')
            .first()

        const [clusters, superClusters] = await Promise.all([
            Cluster.query()
                .where('accountHandle', account.handle)
                .preload('superCluster'),
            SuperCluster.query()
                .where('accountHandle', account.handle)
        ])

        // Sérialiser les données pour le frontend
        const serializedClusters = clusters.map(cluster => ({
            id: cluster.id,
            tag: cluster.tag,
            handles: cluster.handles || [],
            size: cluster.size,
            accountHandle: cluster.accountHandle,
            superClusterId: cluster.superClusterId,
            embeddings: cluster.embeddings || [],
            superCluster: cluster.superCluster ? {
                id: cluster.superCluster.id,
                tag: cluster.superCluster.tag
            } : undefined
        }))

        const serializedSuperClusters = superClusters.map(superCluster => ({
            id: superCluster.id,
            tag: superCluster.tag,
            handles: superCluster.handles || [],
            size: superCluster.size,
            accountHandle: superCluster.accountHandle,
            embeddings: superCluster.embeddings || []
        }))

        // Préparer les données d'analyse pour le frontend
        const analysisStatus = currentAnalysis ? {
            id: currentAnalysis.id,
            status: currentAnalysis.status,
            progress: currentAnalysis.progress,
            startedAt: currentAnalysis.startedAt,
            completedAt: currentAnalysis.completedAt,
            errorMessage: currentAnalysis.errorMessage
        } : null

        return inertia.render('AudienceAnalysis', {
            account,
            analysisStatus,
            clusters: serializedClusters,
            superClusters: serializedSuperClusters
        })
    }

    /**
     * Liste toutes les analyses (actives et passées) pour les comptes de l'utilisateur
     */
    public async listAnalyses({ response, auth, request }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({
                    status: 'error',
                    message: 'Non autorisé'
                })
            }

            // Paramètres de pagination
            const page = request.input('page', 1)
            const limit = request.input('limit', 20)
            const statusFilter = request.input('status')

            // Récupérer les comptes de l'utilisateur
            const userAccountIds = await Account.query()
                .where('user_id', user.id)
                .select('id')
                .then(accounts => accounts.map(account => account.id))

            // Construire la requête
            let query = AnalysisAudience.query()
                .whereIn('account_id', userAccountIds)
                .preload('account')
                .orderBy('created_at', 'desc')

            // Appliquer le filtre de statut si fourni
            if (statusFilter) {
                query = query.where('status', statusFilter)
            }

            // Paginer les résultats
            const analyses = await query.paginate(page, limit)

            return response.json({
                status: 'success',
                data: analyses.toJSON()
            })
        } catch (error) {
            console.error("Erreur lors de la récupération des analyses:", error)
            return response.status(500).json({
                status: 'error',
                message: `Une erreur est survenue: ${error.message}`
            })
        }
    }

    /**
     * Calcule la priorité pour les analyses en bulk
     * Plus la priorité est élevée, plus elle sera traitée rapidement
     * 
     * @param userPlan Plan de l'utilisateur (free, premium, etc.)
     * @param totalFollowers Nombre total de followers du compte
     * @param analyzedFollowers Nombre de followers déjà analysés
     * @returns Priorité calculée (plus élevé = plus prioritaire)
     */
    private calculateBulkAnalysisPriority(
        userPlan: string,
        totalFollowers: number,
        analyzedFollowers: number
    ): number {
        // Priorité de base selon le plan
        const planPriority = this.getPlanBasePriority(userPlan)

        // Facteur inversement proportionnel au nombre total de followers
        // Plus on a de followers, moins on est prioritaire (traitement plus long)
        const followersFactor = Math.max(1, Math.log10(Math.max(totalFollowers, 1)))
        const followersAdjustment = 1000 / followersFactor

        // Bonus si aucun follower n'a encore été analysé (première analyse)
        const firstAnalysisBonus = analyzedFollowers === 0 ? 500 : 0

        // Calcul final de la priorité
        const finalPriority = Math.round(planPriority + followersAdjustment + firstAnalysisBonus)

        return Math.max(1, finalPriority) // Assurer une priorité minimale de 1
    }

    /**
     * Retourne la priorité de base selon le plan utilisateur
     */
    // Il faut absolument bouger cette méthode dans une fonction dans le service AiSchedulerService
    private getPlanBasePriority(plan: string): number {
        switch (plan?.toLowerCase()) {
            case 'premium':
            case 'pro':
                return 2000
            case 'plus':
            case 'standard':
                return 1000
            case 'free':
            case 'basic':
            default:
                return 500
        }
    }

    /**
     * Stream en temps réel du statut d'analyse via Server-Sent Events
     * Maintenant optimisé avec notifications directes depuis le modèle
     */
    public async streamAnalysisStatus(httpContext: HttpContext) {
        const { params, auth } = httpContext
        const user = await auth.authenticate()
        const accountId = params.id

        // Vérifier que l'utilisateur est propriétaire du compte
        await Account.query()
            .where('id', accountId)
            .andWhere('user_id', user.id)
            .firstOrFail()

        // Créer un ID unique pour cette connexion
        const connectionId = `${user.id}-${accountId}-${Date.now()}`

        // Créer la connexion SSE
        sseService.createConnection(connectionId, accountId, httpContext)

        // Fonction pour récupérer le statut initial
        const getInitialStatus = async () => {
            const analysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .orderBy('created_at', 'desc')
                .first()

            if (!analysis) {
                return { status: 'no_analysis' }
            }

            return {
                id: analysis.id,
                status: analysis.status,
                progress: analysis.progress,
                errorMessage: analysis.errorMessage,
                startedAt: analysis.startedAt,
                completedAt: analysis.completedAt,
                updatedAt: analysis.updatedAt
            }
        }

        // Envoyer le statut initial immédiatement
        try {
            const initialStatus = await getInitialStatus()
            sseService.sendToConnection(connectionId, initialStatus)

            // Si l'analyse est déjà terminée, fermer la connexion après 5 secondes
            if (initialStatus.status && ['completed', 'failed', 'stopped'].includes(initialStatus.status)) {
                setTimeout(() => {
                    sseService.closeConnection(connectionId)
                }, 5000)
            }
        } catch (error) {
            console.error('Error getting initial analysis status:', error)
            sseService.sendToConnection(connectionId, { error: 'Failed to get initial status' })
        }

        // Note: Les mises à jour en temps réel sont maintenant gérées automatiquement
        // par les notifications SSE directement depuis le modèle AnalysisAudience
        // via la méthode notifySSEClients() appelée dans markAsStarted(), updateProgress(), etc.
    }

    /**
     * Récupère les clusters d'un compte spécifique (pour tests et vérification)
     */
    public async getClusters({ request, response }: HttpContext) {
        try {
            const accountHandle = request.input('accountHandle')

            if (!accountHandle) {
                return response.status(400).json({
                    status: 'error',
                    message: 'accountHandle parameter is required'
                })
            }

            // Récupérer les clusters pour ce compte
            const clusters = await Cluster.query()
                .where('accountHandle', accountHandle)
                .preload('superCluster')

            const superClusters = await SuperCluster.query()
                .where('accountHandle', accountHandle)

            // Formater les données pour la réponse
            const formattedClusters = clusters.map(cluster => ({
                id: cluster.id,
                tag: cluster.tag,
                handles: cluster.handles || [],
                size: cluster.size,
                accountHandle: cluster.accountHandle,
                superClusterId: cluster.superClusterId,
                embeddings: cluster.embeddings || [],
                superCluster: cluster.superCluster ? {
                    id: cluster.superCluster.id,
                    tag: cluster.superCluster.tag
                } : null
            }))

            const formattedSuperClusters = superClusters.map(superCluster => ({
                id: superCluster.id,
                tag: superCluster.tag,
                handles: superCluster.handles || [],
                size: superCluster.size,
                accountHandle: superCluster.accountHandle,
                embeddings: superCluster.embeddings || []
            }))

            return response.json({
                status: 'success',
                data: {
                    clusters: formattedClusters,
                    superClusters: formattedSuperClusters,
                    accountHandle: accountHandle,
                    totalClusters: formattedClusters.length,
                    totalSuperClusters: formattedSuperClusters.length
                }
            })

        } catch (error) {
            console.error('Error retrieving clusters:', error)
            return response.status(500).json({
                status: 'error',
                message: `Error retrieving clusters: ${error.message}`
            })
        }
    }
}
