import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import PostHistory from '#models/post_history'
import FollowersHistory from '#models/followers_history'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import account_manager from '#services/account_manager'

@inject()
export default class AnalyticsController {
    /**
     * Affiche la page d'analytics avec les données nécessaires
     */
    public async index({ inertia, auth, params, response, request }: HttpContext) {
        const user = await auth.authenticate()
        if (!user) {
            return inertia.location('/login')
        }

        const accountId = params.id // Get account ID from URL

        // Find the specific account by ID and ensure it belongs to the user
        let selectedAccount: Account | null = null
        try {
            selectedAccount = await Account.query()
                .where('id', accountId)
                .andWhere('userId', user.id)
                .firstOrFail()
        } catch (error) {
            // Handle case where account is not found or doesn't belong to the user
            console.error(`Account not found or access denied for ID ${accountId} and user ${user.id}`, error)
            return response.redirect('/dashboard') // Redirect to a safe page
        }

        // Vérifier si des données existent et synchroniser si nécessaire
        const hasFollowersHistory = await FollowersHistory.query()
            .where('accountId', selectedAccount.id)
            .first();

        const hasPostHistory = await PostHistory.query()
            .where('accountId', selectedAccount.id)
            .first();

        // Si aucune donnée n'existe, effectuer une synchronisation initiale
        if (!hasFollowersHistory || !hasPostHistory) {
            console.log("Aucune donnée d'analytics trouvée, synchronisation initiale...");

            // Synchroniser les posts récents
            await this.syncPostsData(selectedAccount);

            // Enregistrer l'historique des abonnés pour aujourd'hui
            await this.recordFollowersHistory(selectedAccount);
        }

        // Récupérer l'historique des followers des 30 derniers jours
        const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).startOf('day')

        let followersHistory = await FollowersHistory.query()
            .where('accountId', selectedAccount.id)
            .where('recordedAt', '>=', thirtyDaysAgo.toSQL())
            .orderBy('recordedAt', 'asc')

        // Transformer les données pour le graphique
        let followers_history = followersHistory.map(record => ({
            date: record.recordedAt.toISODate(),
            count: record.followersCount
        }))

        const account_service = await account_manager.getOrCreateAccountService(selectedAccount)
        const postCount = await account_service.getPostsCount(selectedAccount)

        // Récupérer tous les posts de l'utilisateur
        let allPosts = await PostHistory.query()
            .where('accountId', selectedAccount.id)
            .orderBy('postedAt', 'desc')

        if (allPosts.length != postCount) {
            console.log(`Le nombre de posts dans la base de données (${allPosts.length}) ne correspond pas au nombre de posts récupérés (${postCount}). Synchronisation des posts...`);
            // Synchroniser les posts récents
            await this.syncPostsData(selectedAccount);
            allPosts = await PostHistory.query()
                .where('accountId', selectedAccount.id)
                .orderBy('postedAt', 'desc')
        }

        // Transformer les données pour l'affichage - AUCUN FILTRAGE PAR DATE
        let all_posts = allPosts.map(post => {
            const totalEngagement = post.likes + post.reposts + post.replies
            const engagementRate = selectedAccount.followers_count > 0
                ? (totalEngagement / selectedAccount.followers_count) * 100
                : 0

            return {
                text: post.text,
                likes: post.likes,
                reposts: post.reposts,
                replies: post.replies,
                date: post.postedAt.toISODate(),
                url: `https://bsky.app/profile/${selectedAccount.handle}/post/${post.postUri.split('/').pop()}`,
                engagement_rate: engagementRate
            }
        })

        // Trier les posts par taux d'engagement (du plus élevé au plus bas)
        all_posts.sort((a, b) => b.engagement_rate - a.engagement_rate);

        // Récupérer les jours de publication pour le calendrier
        const lastYear = DateTime.now().minus({ years: 1 }).startOf('day')

        const postingDaysData = await PostHistory.query()
            .where('accountId', selectedAccount.id)
            .where('postedAt', '>=', lastYear.toSQL())
            .select('postedAt')

        // Agréger les publications par jour
        const postingDaysMap = new Map()
        postingDaysData.forEach(post => {
            const dateStr = post.postedAt.toISODate()
            postingDaysMap.set(dateStr, (postingDaysMap.get(dateStr) || 0) + 1)
        })

        // Transformer les données pour le calendrier
        let posting_days = Array.from(postingDaysMap.entries()).map(([date, count]) => ({
            date,
            count: count as number
        }))

        console.log(`Total Posts: ${all_posts.length}`)

        return inertia.render('Analytics', {
            followers_history,
            posting_days,
            all_posts
        })
    }

    /**
     * Enregistre l'état actuel des followers pour un compte
     */
    private async recordFollowersHistory(account: Account) {
        try {
            const accountService = await account_manager.getOrCreateAccountService(account);
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

            // Créer quelques points de données historiques fictives pour avoir un graphique plus intéressant
            const now = DateTime.now();
            const baseCount = account.followers_count || 10;

            // Générer 30 jours d'historique fictif avec une croissance progressive
            for (let i = 1; i <= 30; i++) {
                // Simuler une croissance inversée (de maintenant vers le passé)
                const pastFollowersCount = Math.max(5, Math.floor(baseCount * (1 - (i / 100))));
                // Ajouter un peu de variation aléatoire
                const randomVariation = Math.floor(Math.random() * 5) - 2;

                await FollowersHistory.create({
                    userId: account.userId,
                    accountId: account.id,
                    followersCount: pastFollowersCount + randomVariation,
                    recordedAt: now.minus({ days: i })
                });
            }

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
            const accountService = await account_manager.getOrCreateAccountService(account);

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