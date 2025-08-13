import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import PostHistory from '#models/post_history'
import FollowersHistory from '#models/followers_history'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import Cluster from '#models/cluster'
import SuperCluster from '#models/superCluster'
import Database from '@adonisjs/lucid/services/db'
import AccountManager from '#services/account_manager'
import { CacheManager } from '#services/cache_manager'
import redis from '@adonisjs/redis/services/main'

// Interfaces pour typer les données d'analytics
interface FollowerHistory {
    date: string | null
    count: number
}

interface PostingDay {
    date: string
    count: number
}

interface PostData {
    text: string
    likes: number
    reposts: number
    replies: number
    views: number
    date: string | null
    url: string
    engagement_rate: number
    weighted_engagement_rate: number
}

interface AnalyticsData {
    followers_history: FollowerHistory[]
    posting_days: PostingDay[]
    all_posts: PostData[]
    account: Account
}
@inject()
export default class AnalyticsController {
    constructor(
        protected account_manager: AccountManager,
        protected cacheManager: CacheManager
    ) { }

    /**
     * Affiche la page d'analytics de base avec les données nécessaires
     * Optimisé pour de meilleures performances avec système de cache intelligent
     */
    public async basicAnalytics({ inertia, auth, params, response }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return inertia.location('/dashboard')
        }

        const accountId = params.id
        const cacheKey = `analytics:basic:${accountId}`
        const lastRefreshKey = `analytics:last_refresh:${accountId}`

        // Vérifier si les données sont en cache et encore valides
        const cachedData = await this.cacheManager.get(cacheKey) as AnalyticsData | null
        const lastRefresh = await this.cacheManager.get(lastRefreshKey) as string | null
        
        const now = DateTime.now()
        const cacheValidDuration = 120 // 2 minutes
        const isCacheValid = cachedData && lastRefresh && 
            now.diff(DateTime.fromISO(lastRefresh), 'seconds').seconds < cacheValidDuration

        let selectedAccount: Account | null = null
        try {
            selectedAccount = await Account.query()
                .select('id', 'userId', 'handle', 'followers_count', 'posts_count', 'appPassword')
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()
        } catch (error) {
            console.error(`Account not found or access denied for ID ${accountId} and user ${user.id}`, error)
            return response.redirect('/dashboard')
        }

        // Si le cache est valide, l'utiliser
        if (isCacheValid) {
            console.log('Utilisation des données en cache pour analytics (cache valide)')
            const { followers_history, posting_days, all_posts, account } = cachedData
            return inertia.render('analytics', {
                followers_history,
                posting_days,
                all_posts,
                account,
                cached: true,
                lastRefresh
            })
        }

        // Cache expiré ou inexistant, charger les données fraîches immédiatement
        console.log('Cache expiré ou inexistant, chargement des données analytics fraîches...')
        const analyticsData = await this.loadAnalyticsData(selectedAccount)
        
        // Mettre en cache les données fraîches
        await Promise.all([
            this.cacheManager.set(cacheKey, analyticsData, cacheValidDuration * 3), // Cache de 6 minutes
            this.cacheManager.set(lastRefreshKey, now.toISO(), cacheValidDuration * 3)
        ])

        const { followers_history, posting_days, all_posts, account } = analyticsData
        return inertia.render('analytics', {
            followers_history,
            posting_days,
            all_posts,
            account,
            cached: false,
            lastRefresh: now.toISO()
        })
    }


    /**
     * Charge les données analytics depuis la base de données
     */
    private async loadAnalyticsData(selectedAccount: Account): Promise<AnalyticsData> {

        const account_service = await this.account_manager.getOrCreateAccountService(selectedAccount)
        await account_service.updateAccountStats(selectedAccount)

        const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).startOf('day')
        const lastYear = DateTime.now().minus({ years: 1 }).startOf('day')
        const thirtyDaysAgoSQL = thirtyDaysAgo.toSQL()
        const lastYearSQL = lastYear.toSQL()

        const [hasDataResults, postCount, followersTotalCount] = await Promise.all([
            Database.query()
                .from(query => {
                    query.from('followers_histories')
                        .count('* as followers_count')
                        .where('account_id', selectedAccount!.id)
                        .as('f')
                })
                .joinRaw('CROSS JOIN (SELECT COUNT(*) as posts_count FROM post_histories WHERE account_id = ?) p', [selectedAccount!.id])
                .select('followers_count', 'posts_count')
                .first(),
            selectedAccount.posts_count
                ? Promise.resolve(selectedAccount.posts_count)
                : this.account_manager.getOrCreateAccountService(selectedAccount)
                    .then(service => service.getPostsCount(selectedAccount)),

            FollowersHistory.query()
                .where('account_id', selectedAccount.id)
                .orderBy('recordedAt', 'desc')
                .limit(1)
                .firstOrFail()
                .then(latest => latest.followersCount)
                .catch(() => selectedAccount.followers_count || 0)
        ])

        const needsInitialSync =
            !hasDataResults ||
            parseInt(hasDataResults.followers_count) === 0 ||
            parseInt(hasDataResults.posts_count) === 0

        if (needsInitialSync) {
            console.log("Aucune donnée d'analytics trouvée, synchronisation initiale...")

            await Promise.all([
                this.syncPostsData(selectedAccount),
                this.recordFollowersHistory(selectedAccount)
            ])
        }

        const [followersHistory, allPosts] = await Promise.all([

            FollowersHistory.query()
                .select('recordedAt', 'followersCount')
                .where('account_id', selectedAccount.id)
                .where('recordedAt', '>=', thirtyDaysAgoSQL)
                .orderBy('recordedAt', 'asc')
                .limit(31),


            PostHistory.query()
                .select('text', 'likes', 'reposts', 'replies', 'views', 'postedAt', 'postUri')
                .where('account_id', selectedAccount.id)
                .orderBy('postedAt', 'desc')
                .limit(500)
        ])


        const postsCountDifference = postCount - allPosts.length
        if (postsCountDifference > 5) {
            console.log(`Le nombre de posts dans la base de données (${allPosts.length}) est significativement inférieur au nombre attendu (${postCount}). Synchronisation des posts en arrière-plan...`)

            this.syncPostsData(selectedAccount).catch(err =>
                console.error('Erreur lors de la synchronisation en arrière-plan:', err)
            )
        }

        const followers_history: FollowerHistory[] = followersHistory.map(record => ({
            date: record.recordedAt ? record.recordedAt.toISODate() : null,
            count: record.followersCount || 0
        }))

        const postingDaysRaw = await Database.from('post_histories')
            .select(Database.raw('DATE(posted_at) as date, COUNT(*) as count'))
            .where('account_id', selectedAccount.id)
            .where('posted_at', '>=', lastYearSQL)
            .groupBy('date')
            .orderBy('date')

        const posting_days: PostingDay[] = postingDaysRaw.map(item => ({
            date: item.date || '',
            count: Number(item.count) || 0
        }))


        const baseUrl = `https://bsky.app/profile/${selectedAccount.handle}/post/`

        const all_posts: PostData[] = await Promise.all(allPosts.map(async post => {
            // Estimer le nombre de followers au moment du post
            const followersAtPostTime = await this.getFollowersAtPostTime(
                post.postedAt,
                followers_history,
                followersTotalCount
            )

            // Calculer les taux d'engagement (basique et pondéré)
            const engagementRates = this.calculateEngagementRates(
                post.likes || 0,
                post.reposts || 0,
                post.replies || 0,
                post.views || 0,
                followersAtPostTime
            )

            const postId = post.postUri ? post.postUri.substring(post.postUri.lastIndexOf('/') + 1) : ''

            return {
                text: post.text || '',
                likes: post.likes || 0,
                reposts: post.reposts || 0,
                replies: post.replies || 0,
                views: post.views || 0,
                date: post.postedAt ? post.postedAt.toISODate() : null,
                url: baseUrl + postId,
                engagement_rate: engagementRates.basic,
                weighted_engagement_rate: engagementRates.weighted
            }
        }))

        // Trier par taux d'engagement pondéré (plus précis)
        all_posts.sort((a, b) => b.weighted_engagement_rate - a.weighted_engagement_rate)

        return {
            followers_history,
            posting_days,
            all_posts,
            account: selectedAccount
        }
    }

    /**
     * Affiche la page d'analyse d'audience pour un compte spécifique
     */
    public async audienceAnalysisPage({ params, response, auth, inertia }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.status(401).redirect('/dashboard')
        }

        const accountId = params.id

        try {
            // Trouver le compte spécifique
            const selectedAccount = await Account.query()
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()

            // Récupérer l'analyse d'audience la plus récente
            const currentAnalysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .orderBy('created_at', 'desc')
                .first()

            // Utiliser le système de cache pour récupérer les clusters
            const clusterData = await this.getCachedClusterData(selectedAccount.handle)

            console.log('Clusters trouvés:', clusterData.clusters.length, 'SuperClusters:', clusterData.superClusters.length)

            // Préparer les données d'analyse pour le frontend
            const analysisJob = currentAnalysis ? {
                id: currentAnalysis.id,
                status: currentAnalysis.status,
                progress: currentAnalysis.progress ?
                    (typeof currentAnalysis.progress === 'object' ? currentAnalysis.progress.percentage || 0 : 0) : 0,
                total_followers: currentAnalysis.progress ?
                    (typeof currentAnalysis.progress === 'object' ? currentAnalysis.progress.total || 0 : 0) : 0,
                processed_followers: currentAnalysis.progress ?
                    (typeof currentAnalysis.progress === 'object' ? currentAnalysis.progress.analyzed || 0 : 0) : 0,
                started_at: currentAnalysis.startedAt?.toISO() || '',
                completed_at: currentAnalysis.completedAt?.toISO(),
                error_message: currentAnalysis.errorMessage || undefined
            } : undefined

            // Déterminer si l'analyse est en cours - utiliser les statuts corrects
            const analysisRunning = currentAnalysis ? ['pending', 'in_progress'].includes(currentAnalysis.status) : false

            // Si l'analyse est complétée, charger les clusters et super clusters
            if (clusterData.superClusters.length > 0 || clusterData.clusters.length > 0) {
                console.log('Analyse d\'audience déjà commencée, chargement des données...')

                return inertia.render('AudienceAnalysis', {
                    account: selectedAccount,
                    clusters: clusterData.clusters,
                    superClusters: clusterData.superClusters,
                    analysis_job: analysisJob,
                    analysis_running: analysisRunning,
                    isRealData: true,
                    cache_info: {
                        fromCache: clusterData.fromCache,
                        cachedAt: clusterData.cachedAt
                    }
                })
            } else {
                console.log('Analyse d\'audience non complétée, affichage de la page avec données fictives...')

                return inertia.render('AudienceAnalysis', {
                    account: selectedAccount,
                    clusters: [],
                    superClusters: [],
                    analysis_job: analysisJob,
                    analysis_running: analysisRunning,
                    isRealData: false,
                    cache_info: null
                })
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'analyse d\'audience:', error)
            return response.redirect('/dashboard')
        }
    }

    /**
     * Met à jour les données de la page d'analyse d'audience sans rechargement complet
     * Utilisé pour le refresh en temps réel via Inertia.js
     */
    public async refreshAnalysisStatus({ params, response, auth, inertia }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.status(401).json({ message: 'Non autorisé' })
        }

        const accountId = params.id

        try {
            // Trouver le compte spécifique
            const selectedAccount = await Account.query()
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()

            // Récupérer l'analyse d'audience la plus récente
            const currentAnalysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .orderBy('created_at', 'desc')
                .first()

            const [clusters, superClusters] = await Promise.all([
                Cluster.query()
                    .where('accountHandle', selectedAccount.handle)
                    .preload('superCluster'),
                SuperCluster.query()
                    .where('accountHandle', selectedAccount.handle)
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

            // Retourner uniquement les données mises à jour avec inertia.render()
            return inertia.render('AudienceAnalysis', {
                account: selectedAccount,
                clusters: serializedClusters,
                superClusters: serializedSuperClusters,
                analysisStatus
            })
        } catch (error) {
            console.error('Erreur lors du refresh du statut de l\'analyse:', error)
            return response.status(500).json({
                status: 'error',
                message: 'Erreur lors de la mise à jour du statut'
            })
        }
    }

    /**
     * Enregistre l'état actuel des followers pour un compte
     */
    private async recordFollowersHistory(account: Account) {
        try {
            const accountService = await this.account_manager.getOrCreateAccountService(account);
            await accountService.createOrResumeSession(account);

            // Mettre à jour les stats du compte
            await accountService.updateAccountStats(account);

            const today = DateTime.now().startOf('day');

            // Vérifier s'il existe déjà un enregistrement pour aujourd'hui
            const existingRecord = await FollowersHistory.query()
                .where('account_id', account.id)
                .where('recordedAt', today.toSQLDate()!)
                .first();

            if (existingRecord) {
                // Mettre à jour l'enregistrement existant
                existingRecord.followersCount = account.followers_count || 0;
                await existingRecord.save();
                console.log(`Historique des followers mis à jour pour ${account.handle}: ${account.followers_count} followers`);
            } else {
                // Créer un nouvel enregistrement
                await FollowersHistory.create({
                    userId: account.userId,
                    accountId: account.id,
                    followersCount: account.followers_count || 0,
                    recordedAt: today
                });
                console.log(`Nouvel historique des followers créé pour ${account.handle}: ${account.followers_count} followers`);
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'historique des followers:", error);
        }
    }

    /**
     * Synchronise les posts récents depuis Bluesky pour un compte spécifique
     */
    private async syncPostsData(account: Account) {
        try {
            // Créer une instance de l'agent et du service
            const accountService = await this.account_manager.getOrCreateAccountService(account);

            // Établir une session
            await accountService.createOrResumeSession(account);

            let cursor: string | undefined = undefined;
            let hasMorePosts = true;
            let totalSynced = 0;

            // Récupérer tous les posts à l'aide de la pagination
            while (hasMorePosts) {
                // Récupérer les posts de l'utilisateur avec pagination
                const authorFeed = await accountService.agent.getAuthorFeed({
                    actor: account.handle,
                    limit: 100,
                    cursor: cursor
                });

                if (!authorFeed?.data?.feed || authorFeed.data.feed.length === 0) {
                    console.log(`Fin des posts pour ${account.handle} après ${totalSynced} posts traités`);
                    hasMorePosts = false;
                    break;
                }

                // Mettre à jour le curseur pour la prochaine page
                cursor = authorFeed.data.cursor;
                hasMorePosts = !!cursor;

                // Synchroniser chaque post
                for (const item of authorFeed.data.feed) {
                    const post = item.post;
                    const postedAt = DateTime.fromISO(post.indexedAt);

                    await PostHistory.updateOrCreate(
                        { postUri: post.uri },
                        {
                            accountId: account.id,
                            userId: account.userId,
                            postCid: post.cid,
                            text: (post.record as { text?: string })?.text || '',
                            likes: post.likeCount || 0,
                            reposts: post.repostCount || 0,
                            replies: post.replyCount || 0,
                            views: 0,
                            postedAt: postedAt
                        }
                    );
                    totalSynced++;
                }

                console.log(`Traitement de la page terminé pour ${account.handle}, ${totalSynced} posts traités jusqu'à présent`);

                // Ajouter un petit délai pour éviter de surcharger l'API
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`${totalSynced} posts synchronisés pour ${account.handle}`);
        } catch (error) {
            console.error('Erreur lors de la synchronisation des posts:', error);
        }
    }

    /**
     * Synchronise les posts récents depuis Bluesky pour un compte spécifique (endpoint public)
     */
    public async syncRecentPosts({ params, response, session }: HttpContext) {
        try {
            const accountId = params.id
            const account = await Account.find(accountId)

            if (!account) {
                session.flash('error', 'Compte introuvable')
                return response.redirect().back()
            }

            await this.syncPostsData(account);
            session.flash('success', 'Posts synchronisés avec succès');

            return response.redirect().back()
        } catch (error) {
            console.error('Erreur lors de la synchronisation des posts:', error)
            session.flash('error', `Erreur lors de la synchronisation: ${error.message}`)
            return response.redirect().back()
        }
    }

    /**
     * Affiche les détails d'un cluster spécifique
     */
    public async clusterDetail({ inertia, auth, params, response }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.redirect('/dashboard')
        }

        try {
            // Récupérer le compte associé à l'ID et à l'utilisateur authentifié
            const account = await Account.query()
                .where('id', params.id)
                .where('userId', user.id)
                .firstOrFail()

            // Récupérer le cluster spécifique
            const cluster = await Cluster.query()
                .where('id', params.clusterId)
                .where('accountHandle', account.handle)
                .first()

            if (!cluster) {
                return response.redirect(`/analytics/${account.id}/audience`)
            }

            return inertia.render('ClusterDetail', {
                account,
                cluster,
                type: 'cluster'
            })
        } catch (error) {
            console.error('Erreur lors du chargement du cluster:', error)
            return response.redirect('/dashboard')
        }
    }

    /**
     * Affiche les détails d'un super cluster spécifique
     */
    public async superClusterDetail({ inertia, auth, params, response }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.redirect('/dashboard')
        }

        try {
            // Récupérer le compte associé à l'ID et à l'utilisateur authentifié
            const account = await Account.query()
                .where('id', params.id)
                .where('userId', user.id)
                .firstOrFail()

            // Récupérer le super cluster spécifique
            const superCluster = await SuperCluster.query()
                .where('id', params.superClusterId)
                .where('accountHandle', account.handle)
                .first()

            if (!superCluster) {
                return response.redirect(`/analytics/${account.id}/audience`)
            }

            // Récupérer les clusters enfants
            const childClusters = await Cluster.query()
                .where('superClusterId', superCluster.id)
                .where('accountHandle', account.handle)

            return inertia.render('ClusterDetail', {
                account,
                superCluster,
                childClusters,
                type: 'supercluster'
            })
        } catch (error) {
            console.error('Erreur lors du chargement du super cluster:', error)
            return response.redirect('/dashboard')
        }
    }

    /**
     * Récupère les données de clusters depuis le cache ou depuis la base de données
     */
    private async getCachedClusterData(accountHandle: string) {
        const cacheKey = `cluster_data:${accountHandle}`
        const cacheTTL = 60 * 60 * 2 // 2 heures de cache

        try {
            // Tenter de récupérer depuis le cache
            const cachedData = await redis.get(cacheKey)
            const parsedData = cachedData ? JSON.parse(cachedData) : null
            if (parsedData && parsedData.clusters && parsedData.superClusters &&
                parsedData.clusters.length > 0 && parsedData.superClusters.length > 0) {
                console.log(`Using cached cluster data for ${accountHandle}`)
                return {
                    clusters: parsedData.clusters,
                    superClusters: parsedData.superClusters,
                    fromCache: true,
                    cachedAt: parsedData.cachedAt
                }
            }
        } catch (cacheError) {
            console.warn('Cache retrieval failed for clusters:', cacheError)
        }

        // Récupérer depuis la base de données
        console.log(`Fetching fresh cluster data for ${accountHandle}...`)
        const [clusters, superClusters] = await Promise.all([
            Cluster.query()
                .where('accountHandle', accountHandle)
                .preload('superCluster'),
            SuperCluster.query()
                .where('accountHandle', accountHandle)
        ])
        console.log('Clusters trouvés:', clusters.length, 'SuperClusters:', superClusters.length)

        // Sérialiser les données
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

        // Mettre en cache les données fraîches
        try {
            await redis.setex(cacheKey, cacheTTL, JSON.stringify({
                clusters: serializedClusters,
                superClusters: serializedSuperClusters,
                cachedAt: new Date().toISOString()
            }))
            console.log(`Cached cluster data for ${accountHandle}`)
        } catch (cacheError) {
            console.warn('Cache storage failed for clusters:', cacheError)
        }

        return {
            clusters: serializedClusters,
            superClusters: serializedSuperClusters,
            fromCache: false,
            cachedAt: new Date().toISOString()
        }
    }

    /**
     * Force le rafraîchissement du cache des clusters
     */
    public async refreshClusterCache({ params, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.status(401).json({ message: 'Non autorisé' })
        }

        const accountId = params.id

        try {
            // Vérifier que le compte appartient à l'utilisateur
            const selectedAccount = await Account.query()
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()

            // Supprimer le cache existant
            const cacheKey = `cluster_data:${selectedAccount.handle}`
            await redis.del(cacheKey)
            console.log(`Cleared cluster cache for ${selectedAccount.handle}`)

            // Récupérer les données fraîches (qui vont automatiquement recréer le cache)
            const clusterData = await this.getCachedClusterData(selectedAccount.handle)

            return response.json({
                success: true,
                message: 'Cache rafraîchi avec succès',
                data: {
                    clusters: clusterData.clusters,
                    superClusters: clusterData.superClusters,
                    fromCache: clusterData.fromCache,
                    cachedAt: clusterData.cachedAt,
                    clustersCount: clusterData.clusters.length,
                    superClustersCount: clusterData.superClusters.length
                }
            })
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du cache des clusters:', error)
            return response.status(500).json({
                success: false,
                message: 'Erreur lors du rafraîchissement du cache'
            })
        }
    }

    /**
     * API endpoint pour récupérer les données de clusters (avec cache)
     */
    public async getClusterData({ params, response, auth }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.status(401).json({ message: 'Non autorisé' })
        }

        const accountId = params.id

        try {
            // Vérifier que le compte appartient à l'utilisateur
            const selectedAccount = await Account.query()
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()

            // Récupérer les données depuis le cache ou la base de données
            const clusterData = await this.getCachedClusterData(selectedAccount.handle)

            // Récupérer aussi l'état de l'analyse
            const currentAnalysis = await AnalysisAudience.query()
                .where('account_id', accountId)
                .orderBy('created_at', 'desc')
                .first()

            const analysisJob = currentAnalysis ? {
                id: currentAnalysis.id,
                status: currentAnalysis.status,
                progress: currentAnalysis.progress || 0,
                total_followers: currentAnalysis.progress?.total || 0,
                processed_followers: currentAnalysis.progress?.analyzed || 0,
                started_at: currentAnalysis.startedAt?.toISO() || '',
                completed_at: currentAnalysis.completedAt?.toISO(),
                error_message: currentAnalysis.errorMessage || undefined
            } : undefined

            const analysisRunning = currentAnalysis ? ['pending', 'in_progress'].includes(currentAnalysis.status) : false

            return response.json({
                success: true,
                data: {
                    account: selectedAccount,
                    clusters: clusterData.clusters,
                    superClusters: clusterData.superClusters,
                    analysis_job: analysisJob,
                    analysis_running: analysisRunning,
                    cache_info: {
                        fromCache: clusterData.fromCache,
                        cachedAt: clusterData.cachedAt,
                        clustersCount: clusterData.clusters.length,
                        superClustersCount: clusterData.superClusters.length
                    }
                }
            })
        } catch (error) {
            console.error('Erreur lors de la récupération des données de clusters:', error)
            return response.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des données'
            })
        }
    }

    /**
     * Estime le nombre de followers qu'avait le compte au moment d'un post donné
     * en utilisant l'historique des followers
     */
    private async getFollowersAtPostTime(
        postDate: DateTime,
        followersHistory: FollowerHistory[],
        currentFollowersCount: number
    ): Promise<number> {
        if (followersHistory.length === 0) {
            return currentFollowersCount
        }

        // Chercher l'enregistrement le plus proche de la date du post
        const postDateStr = postDate.toISODate()

        // Trier par date et trouver le point le plus proche
        const sortedHistory = followersHistory
            .filter(h => h.date !== null)
            .sort((a, b) => a.date!.localeCompare(b.date!))

        // Si le post est plus récent que toutes nos données d'historique
        if (postDateStr! > sortedHistory[sortedHistory.length - 1].date!) {
            return currentFollowersCount
        }

        // Si le post est plus ancien que toutes nos données d'historique
        if (postDateStr! < sortedHistory[0].date!) {
            return sortedHistory[0].count
        }

        // Interpolation linéaire entre deux points
        for (let i = 0; i < sortedHistory.length - 1; i++) {
            const current = sortedHistory[i]
            const next = sortedHistory[i + 1]

            if (postDateStr! >= current.date! && postDateStr! <= next.date!) {
                // Interpolation simple ou retour de la valeur la plus proche
                return current.count
            }
        }

        return currentFollowersCount
    }

    /**
     * Calcule le taux d'engagement avec pondération des interactions
     */
    private calculateEngagementRates(
        likes: number,
        reposts: number,
        replies: number,
        views: number,
        followersCount: number
    ): { basic: number; weighted: number } {
        const totalBasicEngagement = likes + reposts + replies
        const totalWeightedEngagement = (likes * 1) + (reposts * 2) + (replies * 3)

        // Utiliser les vues si disponibles, sinon fallback sur les followers
        const denominator = views > 0 ? views : Math.max(1, followersCount)

        return {
            basic: (totalBasicEngagement / denominator) * 100,
            weighted: (totalWeightedEngagement / denominator) * 100
        }
    }
}