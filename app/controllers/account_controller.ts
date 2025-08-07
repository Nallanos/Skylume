import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import { AtpAgent } from '@atproto/api'

// Models
import User from '#models/user'
import Account from '#models/account'
import FollowersHistory from '#models/followers_history'
import PostHistory from '#models/post_history'
import AccountManager from '#services/account_manager'
import { CacheManager } from '#services/cache_manager'

@inject()
export default class AccountController {
  constructor(protected account_manager: AccountManager, protected cacheManager: CacheManager) { }


  public async createAccount({ request, auth, response, session }: HttpContext) {
    const agent = new AtpAgent({ service: "https://bsky.social" })
    try {
      const { token_app_password, bksy_social, remember_me } = request.only(['token_app_password', 'bksy_social', 'remember_me'])
      console.log('CreateAccount called for handle:', bksy_social)

      if (!token_app_password || !bksy_social) {
        session.flash("errors.credentials", "Missing app password or social handle.")
        return response.redirect().back()
      }

      try {
        const bskySession = await agent.login({ identifier: bksy_social, password: token_app_password })

        if (!bskySession) {
          session.flash("errors.credentials", "Failed to retrieve session. Please verify your credentials.")
          return response.redirect().back()
        }

        const token = await agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" }, { headers: { Authorization: `Bearer ${bskySession.data.accessJwt}` } })
        if (!token.data.token) {
          session.flash("errors.credentials", "Please, grants us access to your DMS.")
          return response.redirect().back()
        }

      } catch (err) {
        session.flash("errors.credentials", `Failed to retrieve session. Please check if you have granted us access to your DMS and that you're credentials are valid. \n ${err.message}`)
        return response.redirect().back()
      }

      let user: User | undefined;

      // First, try to find existing user by handle/email
      const existingUser = await User.findBy('email', bksy_social)

      if (existingUser) {
        // User exists, login directly
        try {
          await auth.use('web').login(existingUser, !!remember_me)
          user = existingUser
          console.log('Logged in existing user:', bksy_social)
        } catch (err) {
          console.error("Error logging in existing user:", err)
          session.flash("errors.credentials", "Failed to login existing account.")
          return response.redirect().back()
        }
      } else {
        // User doesn't exist, create new one
        try {
          console.log('Creating new user account for:', bksy_social)
          user = await this.createUser(bksy_social, token_app_password)
          if (!user) {
            session.flash("errors.credentials", "Failed to create user account.")
            return response.redirect().back()
          }
          await auth.use('web').login(user, !!remember_me)
        } catch (err) {
          console.error("Error creating user:", err)
          session.flash("errors.credentials", "Failed to create user account. Please try again.")
          return response.redirect().back()
        }
      }

      const accountData = {
        userId: user.id,
        appPassword: token_app_password,
        handle: bksy_social,
        id: crypto.randomBytes(16).toString('hex'),
        seenNotificationAt: new Date().toISOString()
      }

      const account = await Account.create(accountData)

      if (!account) {
        session.flash("errors.credentials", "Failed to create account. Please verify your information.")
        return response.redirect().back()
      }

      // Initialiser l'historique des abonnés pour le nouveau compte
      const accountService = await this.account_manager.getOrCreateAccountService(account)
      await accountService.createOrResumeSession(account)

      try {
        // Mettre à jour les statistiques du compte (followers_count, posts_count, engagement_rate)
        await accountService.updateAccountStats(account)

        // Récupérer le nombre actuel d'abonnés (maintenant stocké dans account.followers_count)
        const followersCount = account.followers_count || await accountService.getFollowersCount(account)

        // Créer un premier enregistrement dans l'historique des abonnés
        await FollowersHistory.create({
          userId: user.id,
          accountId: account.id,
          followersCount,
          recordedAt: DateTime.now()
        })

        // Synchroniser les posts récents pour le nouveau compte
        const authorFeed = await agent.getAuthorFeed({ actor: account.handle, limit: 20 })

        if (authorFeed && authorFeed.data && authorFeed.data.feed) {
          for (const item of authorFeed.data.feed) {
            const post = item.post
            const postedAt = DateTime.fromISO(post.indexedAt)

            await PostHistory.create({
              accountId: account.id,
              userId: user.id,
              postUri: post.uri,
              postCid: post.cid,
              text: post.record && typeof post.record === 'object' && 'text' in post.record ? String(post.record.text) : '',
              likes: post.likeCount || 0,
              reposts: post.repostCount || 0,
              replies: post.replyCount || 0,
              views: 0,
              postedAt: postedAt
            })
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation des données d'analytics:", error)
      }
      return response.redirect('/dashboard')
    } catch (err: any) {
      if (err && err.error === "AuthFactorTokenRequired") {
        session.flash("errors.credentials", "Check your email for two-factor authentication.")
        return response.redirect().back()
      }
      else if (err.constraint === "accounts_handle_unique") {
        session.flash("errors.credentials", "Account already exists.")
        return response.redirect().back()
      }
      console.error(err)
      session.flash("errors.credentials", "An unexpected error occurred. Please try again.")
      return response.redirect().back()
    }
  }

  private async createUser(handle: string, appPassword: string) {
    try {
      // Check if user already exists
      const userAlreadyExists = await User.findBy('email', handle)
      if (userAlreadyExists) {
        console.log('User already exists:', handle)
        return userAlreadyExists
      }

      // Create new user
      console.log('Creating new user:', handle)
      const newUser = await User.create({
        id: handle,
        email: handle,
        password: appPassword,
        createdAt: DateTime.now()
      })

      if (!newUser) {
        throw new Error('Failed to create user')
      }

      console.log('User created successfully:', handle)
      return newUser

    } catch (err) {
      console.error("Error in createUser:", err)
      throw err
    }
  }

  public async deleteAccount({ request, response, session }: HttpContext) {
    try {
      const { id } = request.only(['id'])
      if (!id) {
        session.flash("errors.credentials", "Account ID is required.")
        return response.redirect().back()
      }

      const account = await Account.find(id)

      if (!account) {
        session.flash("errors.credentials", "Account not found.")
        return response.redirect().back()
      }


      console.log("Deleting account:", account.handle)
      await account.delete()
      session.flash("success", "Account deleted successfully.")
      return response.redirect().back()
    } catch (err: any) {
      console.error("Unexpected error in deleteAccount:", err)
      session.flash("errors.credentials", "An error occurred while deleting the account. Please try again.")
      return response.redirect().back()
    }
  }

  public async refreshStats({ params, response, session }: HttpContext) {
    try {
      const accountId = params.id

      const account = await Account.find(accountId)
      if (!account) {
        session.flash("errors.account", "Account not found.")
        return response.redirect().back()
      }

      const accountService = await this.account_manager.getOrCreateAccountService(account)

      // Établir la session
      await accountService.createOrResumeSession(account)

      // Mettre à jour les statistiques
      await accountService.updateAccountStats(account)

      try {
        await this.cacheManager.delete(`analytics:basic:${accountId}`)
        console.log(`Cache invalidé pour le compte ${account.handle}`)
      } catch (cacheError) {
        console.warn('Échec d\'invalidation du cache:', cacheError)
      }

      // Mettre à jour l'historique des abonnés
      try {
        const followersCount = account.followers_count

        const today = DateTime.now().startOf('day')

        // Vérifier si un enregistrement existe déjà pour aujourd'hui
        const existingRecord = await FollowersHistory.query()
          .where('accountId', account.id)
          .where('recordedAt', today.toSQL())
          .first()

        if (existingRecord) {
          existingRecord.followersCount = followersCount
          await existingRecord.save()
        } else {
          await FollowersHistory.create({
            userId: account.userId,
            accountId: account.id,
            followersCount,
            recordedAt: today
          })
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'historique des abonnés:", error)
        // Ne pas bloquer le rafraîchissement des stats en cas d'erreur
      }

      // Synchroniser les posts récents
      try {
        // Récupérer les posts récents de l'utilisateur
        const authorFeed = await accountService.agent.getAuthorFeed({ actor: account.handle, limit: 10 })

        if (authorFeed && authorFeed.data && authorFeed.data.feed) {
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
            } else {
              // Créer une nouvelle entrée d'historique pour ce post
              await PostHistory.create({
                accountId: account.id,
                userId: account.userId,
                postUri: post.uri,
                postCid: post.cid,
                text: post.record && typeof post.record === 'object' && 'text' in post.record ? String(post.record.text) : '',
                likes: post.likeCount || 0,
                reposts: post.repostCount || 0,
                replies: post.replyCount || 0,
                views: 0,
                postedAt: postedAt
              })
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors de la synchronisation des posts:", error)
        // Ne pas bloquer le rafraîchissement des stats en cas d'erreur
      }

      session.flash("success", "Account statistics refreshed successfully.")
      return response.redirect().back()
    } catch (err: any) {
      console.error("Error refreshing account stats:", err)
      session.flash("errors.account", "An error occurred while refreshing account statistics.")
      return response.redirect().back()
    }
  }

  /**
   * API endpoint pour rafraîchir les stats sans rechargement de page
   */
  public async refreshStatsApi({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' })
      }

      const accountId = params.id

      const account = await Account.query()
        .where('id', accountId)
        .andWhere('userId', user.id)
        .first()

      if (!account) {
        return response.status(404).json({ error: 'Account not found' })
      }

      const accountService = await this.account_manager.getOrCreateAccountService(account)

      // Établir la session
      await accountService.createOrResumeSession(account)

      // Mettre à jour les statistiques
      await accountService.updateAccountStats(account)

      // Invalider le cache analytics
      try {
        await this.cacheManager.delete(`analytics:basic:${accountId}`)
        console.log(`Cache invalidé pour le compte ${account.handle}`)
      } catch (cacheError) {
        console.warn('Échec d\'invalidation du cache:', cacheError)
      }

      // Retourner les nouvelles données
      await account.refresh()
      
      return response.json({
        success: true,
        account: {
          id: account.id,
          handle: account.handle,
          followersCount: account.followers_count,
          postsCount: account.posts_count,
          isRateLimited: account.isRateLimited
        }
      })
    } catch (err: any) {
      console.error("Error refreshing account stats via API:", err)
      return response.status(500).json({ error: 'Failed to refresh account statistics' })
    }
  }
}
