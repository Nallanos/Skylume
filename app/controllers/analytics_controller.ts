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
    date: string | null
    url: string
    engagement_rate: number
}

interface AnalyticsData {
    followers_history: FollowerHistory[]
    posting_days: PostingDay[]
    all_posts: PostData[]
    account: Account
}
@inject()
export default class AnalyticsController {
    constructor(protected account_manager: AccountManager, protected cacheManager: CacheManager) { }

    /**
     * Affiche la page d'analytics de base avec les données nécessaires
     * Optimisé pour de meilleures performances
     */
    public async basicAnalytics({ inertia, auth, params, response }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return inertia.location('/dashboard')
        }

        const accountId = params.id
        const cacheKey = `analytics:basic:${accountId}`

        const cachedData = await this.cacheManager.get(cacheKey) as AnalyticsData | null
        if (cachedData) {
            console.log('Utilisation des données en cache pour analytics')
            const { followers_history, posting_days, all_posts, account } = cachedData
            return inertia.render('Analytics', {
                followers_history,
                posting_days,
                all_posts,
                account
            })
        }


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
                .select('text', 'likes', 'reposts', 'replies', 'postedAt', 'postUri')
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


        const followersDivisor = Math.max(1, followersTotalCount)
        const baseUrl = `https://bsky.app/profile/${selectedAccount.handle}/post/`

        const all_posts: PostData[] = allPosts.map(post => {
            const totalEngagement = (post.likes || 0) + (post.reposts || 0) + (post.replies || 0)
            const engagementRate = (totalEngagement / followersDivisor) * 100
            const postId = post.postUri ? post.postUri.substring(post.postUri.lastIndexOf('/') + 1) : ''

            return {
                text: post.text || '',
                likes: post.likes || 0,
                reposts: post.reposts || 0,
                replies: post.replies || 0,
                date: post.postedAt ? post.postedAt.toISODate() : null,
                url: baseUrl + postId,
                engagement_rate: engagementRate
            }
        })

        all_posts.sort((a, b) => b.engagement_rate - a.engagement_rate)

        const responseData: AnalyticsData = {
            followers_history,
            posting_days,
            all_posts,
            account: selectedAccount
        }

        await this.cacheManager.set(cacheKey, responseData, 300)

        return inertia.render('Analytics', {
            followers_history,
            posting_days,
            all_posts,
            account: selectedAccount
        })
    }

    /**
     * Affiche la page d'analyse d'audience pour un compte spécifique
     */
    public async audienceAnalysisPage({ params, response, auth, inertia }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return response.status(401).redirect('/login')
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

            console.log("Clusters:", clusters)
            console.log("superClusters: ", superClusters)


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
                } : null
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

            // Si l'analyse est complétée, charger les clusters et super clusters
            if (serializedSuperClusters.length > 0 || serializedClusters.length > 0) {
                console.log('Analyse d\'audience déjà commencée, chargement des données...')

                console.log(serializedSuperClusters)
                return inertia.render('AudienceAnalysis', {
                    account: selectedAccount,
                    clusters: serializedClusters,
                    superClusters: serializedSuperClusters,
                    analysisStatus
                })
            } else {
                // Si l'analyse n'est pas encore complétée, afficher la page avec les données de base
                console.log('Analyse d\'audience non complétée, affichage de la page avec données de base...')
                return inertia.render('AudienceAnalysis', {
                    account: selectedAccount,
                    clusters: [],
                    superClusters: [],
                    analysisStatus
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

            // Enregistrer le nombre actuel de followers
            await FollowersHistory.create({
                userId: account.userId,
                accountId: account.id,
                followersCount: account.followers_count || 0,
                recordedAt: DateTime.now()
            });

            console.log(`Historique des followers créé pour ${account.handle}`);
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


}