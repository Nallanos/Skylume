import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Account from '#models/account'
import PostHistory from '#models/post_history'
import { DateTime } from 'luxon'
import account_manager from '#services/account_manager'

export default class SyncPosts extends BaseCommand {
  static commandName = 'sync:posts'
  static description = 'Synchronise les posts récents de tous les comptes pour les analytics'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Début de la synchronisation des posts pour les analytics')

    try {
      // Récupérer tous les comptes actifs
      const accounts = await Account.all()
      this.logger.info(`Traitement de ${accounts.length} comptes`)

      let totalPostsSync = 0
      let errorCount = 0

      for (const account of accounts) {
        try {
          this.logger.info(`Synchronisation des posts pour ${account.handle}...`)

          // Créer une instance de l'agent et du service
          const accountService = await account_manager.getOrCreateAccountService(account)

          // Établir une session
          await accountService.createOrResumeSession(account)

          // Récupérer les posts récents de l'utilisateur
          const authorFeed = await accountService.agent.getAuthorFeed({ actor: account.handle, limit: 25 })

          if (!authorFeed || !authorFeed.data || !authorFeed.data.feed) {
            this.logger.warning(`Aucun post récent trouvé pour ${account.handle}`)
            continue
          }

          let postsSynced = 0

          // Synchroniser chaque post
          for (const item of authorFeed.data.feed) {
            const post = item.post

            // Vérifier si le post existe déjà dans l'historique
            const existingPost = await PostHistory.query()
              .where('postUri', post.uri)
              .first()

            const postedAt = DateTime.fromISO(post.indexedAt)

            if (existingPost) {
              // Mise à jour des statistiques du post existant
              existingPost.likes = post.likeCount || 0
              existingPost.reposts = post.repostCount || 0
              existingPost.replies = post.replyCount || 0
              await existingPost.save()
              this.logger.debug(`Post mis à jour: ${post.uri}`)
            } else {
              // Créer une nouvelle entrée d'historique pour ce post
              await PostHistory.create({
                accountId: account.id,
                userId: account.userId,
                postUri: post.uri,
                postCid: post.cid,
                text: (post.record as { text?: string })?.text || '',
                likes: post.likeCount || 0,
                reposts: post.repostCount || 0,
                replies: post.replyCount || 0,
                views: 0, // Bluesky n'a pas de compteur de vues public
                postedAt: postedAt
              })
              postsSynced++
            }
          }

          this.logger.success(`${postsSynced} nouveaux posts synchronisés pour ${account.handle}`)
          totalPostsSync += postsSynced

        } catch (error) {
          this.logger.error(`Erreur lors de la synchronisation des posts pour ${account.handle}: ${error.message}`)
          errorCount++
        }
      }

      this.logger.success(`Synchronisation terminée: ${totalPostsSync} nouveaux posts synchronisés, ${errorCount} erreurs`)

    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation des posts: ${error.message}`)
      this.exitCode = 1
    }
  }
}