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
import OAuthService from '#services/oauth_service'
import OAuthApiService from '#services/oauth_api_service'

@inject()
export default class AccountController {
  constructor(
    protected account_manager: AccountManager, 
    protected cacheManager: CacheManager,
    protected oauthService: OAuthService,
    protected oauthApiService: OAuthApiService
  ) { }

  /**
   * Initiate OAuth authorization flow
   */
  public async initiateOAuth({ response, session }: HttpContext) {
    try {
      console.log('OAuth initiation called')
      await this.oauthService.initiateAuthFlow({ response, session } as HttpContext)
    } catch (error) {
      console.error('OAuth initiation error:', error)
      session.flash('errors.oauth', `Failed to start OAuth flow: ${error.message}`)
      return response.redirect('/dashboard')
    }
  }

  /**
   * Handle OAuth callback
   */
  public async handleOAuthCallback({ request, response, session, auth }: HttpContext) {
    try {
      const oauthSessionData = await this.oauthService.handleCallback({ request, session } as HttpContext)
      
      if (!oauthSessionData) {
        return response.redirect('/add/account')
      }

      // For OAuth, we need to make direct API calls with DPoP tokens
      // Cannot use resumeSession with OAuth tokens - they are different from session JWTs
      
      // Get profile information using OAuth API service
      const profileData = await this.oauthApiService.getProfile(
        oauthSessionData.did, 
        oauthSessionData.accessToken, 
        oauthSessionData.dpopKeyPair
      )
      
      const handle = profileData.handle || oauthSessionData.did

      let user: User | undefined

      // Check if user is already authenticated
      try {
        user = await auth.authenticate()
      } catch {
        // Create or find user based on handle
        const existingUser = await User.find(handle)
        
        if (existingUser) {
          await auth.use('web').login(existingUser)
          user = existingUser
        } else {
          // Create new user with OAuth data
          user = await this.createUser(handle, '') // No password for OAuth users
          if (user) {
            await auth.use('web').login(user)
          }
        }
      }

      if (!user) {
        session.flash('errors.oauth', 'Failed to create or authenticate user.')
        return response.redirect('/add/account')
      }

      // Check if account already exists
      const existingAccount = await Account.query()
        .where('userId', user.id)
        .where('handle', handle)
        .first()

      if (existingAccount) {
        // Update existing account with new OAuth session
        existingAccount.session = JSON.stringify({
          type: 'oauth',
          accessToken: oauthSessionData.accessToken,
          refreshToken: oauthSessionData.refreshToken,
          did: oauthSessionData.did,
          expiresAt: oauthSessionData.expiresAt.toISOString(),
          dpopKeyPair: oauthSessionData.dpopKeyPair,
          metadata: oauthSessionData.metadata
        })
        await existingAccount.save()
        
        session.flash('success', 'Account updated successfully with OAuth authentication.')
        return response.redirect('/dashboard')
      }

      // Create new account with OAuth session
      const accountData = {
        userId: user.id,
        handle: handle,
        did: oauthSessionData.did,
        session: JSON.stringify({
          type: 'oauth',
          accessToken: oauthSessionData.accessToken,
          refreshToken: oauthSessionData.refreshToken,
          did: oauthSessionData.did,
          expiresAt: oauthSessionData.expiresAt.toISOString(),
          dpopKeyPair: oauthSessionData.dpopKeyPair,
          metadata: oauthSessionData.metadata
        }),
        id: crypto.randomBytes(16).toString('hex'),
        seenNotificationAt: new Date().toISOString()
      }

      const account = await Account.create(accountData)

      if (!account) {
        session.flash('errors.oauth', 'Failed to create account.')
        return response.redirect('/add/account')
      }

      // Initialize account data
      try {
        const accountService = await this.account_manager.getOrCreateAccountService(account)
        await accountService.createOrResumeSession(account)
        await accountService.updateAccountStats(account)

        // Create initial followers history
        const followersCount = account.followers_count || await accountService.getFollowersCount(account)
        await FollowersHistory.create({
          userId: user.id,
          accountId: account.id,
          followersCount,
          recordedAt: DateTime.now()
        })

        // Sync recent posts using OAuth API service
        const feedData = await this.oauthApiService.getUserPosts(
          account.did,
          oauthSessionData.accessToken,
          oauthSessionData.dpopKeyPair,
          20
        )

        if (feedData?.records) {
          for (const record of feedData.records) {
            const postedAt = DateTime.fromISO(record.value.createdAt)

            await PostHistory.create({
              accountId: account.id,
              userId: user.id,
              postUri: record.uri,
              postCid: record.cid,
              text: record.value.text || '',
              likes: 0, // OAuth doesn't provide engagement metrics directly
              reposts: 0,
              replies: 0,
              views: 0,
              postedAt: postedAt
            })
          }
        }
      } catch (error) {
        console.error("Error initializing account data:", error)
      }
      
      session.flash('success', 'Account connected successfully via OAuth!')
      return response.redirect('/dashboard')

    } catch (error) {
      console.error('OAuth callback error:', error)
      session.flash('errors.oauth', 'Failed to complete OAuth authentication.')
      return response.redirect('/add/account')
    }
  }


  public async createAccount({ request, auth, response, session }: HttpContext) {
    const agent = new AtpAgent({ service: "https://bsky.social" })
    try {
      const { credential, password, remember_me } = request.only(['credential', 'password', 'remember_me'])
      console.log('CreateAccount called for credential:', credential)

      if (!credential || !password) {
        session.flash("errors.credentials", "Missing credential or password.")
        return response.redirect().back()
      }

      // Authenticate with Bluesky (app password or regular password - both work the same way)
      let bskySession: any
      try {
        bskySession = await agent.login({ identifier: credential, password })
        if (!bskySession) {
          session.flash("errors.credentials", "Failed to retrieve session. Please verify your credentials.")
          return response.redirect().back()
        }

        // Try to verify DM access (optional - won't fail if not available)
        try {
          const token = await agent.com.atproto.server.getServiceAuth({ 
            aud: "did:web:api.bsky.chat", 
            lxm: "chat.bsky.convo.sendMessage" 
          }, { 
            headers: { Authorization: `Bearer ${bskySession.data.accessJwt}` } 
          })
          
          if (!token.data.token) {
            console.log('DM access not available for this account')
          }
        } catch (dmError) {
          console.log('DM access check failed, continuing:', dmError.message)
        }

      } catch (err: any) {
        session.flash("errors.credentials", `Failed to authenticate. Please check your credentials. ${err.message}`)
        return response.redirect().back()
      }

      const handle = credential
      let user: User | undefined

      // Authentication and user creation logic
      try {
        console.log("Attempting authentication for:", credential)
        user = await auth.authenticate()
        console.log('User already authenticated:', user.email)
      } catch {
        console.log('No authenticated user, proceeding with login/creation for:', credential)
        
        // First, try to find user by handle (since handle is the unique identifier)
        const existingUser = await User.find(handle)

        if (existingUser) {
          await auth.use('web').login(existingUser, !!remember_me)
          user = existingUser
          console.log('Logged in existing user:', handle)
        } else {
          // Create new user
          try {
            console.log('Creating new user account for:', handle)
            user = await this.createUser(handle, password)
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
      }

      // Check if account already exists
      const existingAccount = await Account.query()
        .where('userId', user.id)
        .where('handle', handle)
        .first()

      if (existingAccount) {
        session.flash("errors.credentials", "You already have an account with this handle.")
        return response.redirect().back()
      }

      // Create account with session data
      const accountData = {
        userId: user.id,
        handle: handle,
        id: crypto.randomBytes(16).toString('hex'),
        seenNotificationAt: new Date().toISOString(),
        appPassword: password,
        session: JSON.stringify({ type: 'app_password', appPassword: password })
      }

      const account = await Account.create(accountData)

      if (!account) {
        session.flash("errors.credentials", "Failed to create account. Please verify your information.")
        return response.redirect().back()
      }

      // Initialize account data
      try {
        const accountService = await this.account_manager.getOrCreateAccountService(account)
        await accountService.createOrResumeSession(account)
        await accountService.updateAccountStats(account)

        const followersCount = account.followers_count || await accountService.getFollowersCount(account)
        await FollowersHistory.create({
          userId: user.id,
          accountId: account.id,
          followersCount,
          recordedAt: DateTime.now()
        })

        // Sync recent posts
        const authorFeed = await agent.getAuthorFeed({ actor: account.handle, limit: 20 })
        if (authorFeed?.data?.feed) {
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
        console.error("Error initializing account data:", error)
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

  private async createUser(handle: string, password: string) {
    try {
      // Check if user already exists by ID (handle)
      const userAlreadyExists = await User.find(handle)
      if (userAlreadyExists) {
        console.log('User already exists:', handle)
        return userAlreadyExists
      }

      // Create new user with handle as ID and null email
      console.log('Creating new user:', handle)
      const newUser = await User.create({
        id: handle,
        email: null, // Don't use handle as email
        password: password,
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

      // Check if this is an OAuth account
      let sessionData = null;
      if (account.session) {
        try {
          sessionData = JSON.parse(account.session);
        } catch (e) {
          console.error("Invalid session JSON for account:", account.handle);
        }
      }

      let accountService = null;

      if (sessionData?.type === 'oauth') {
        // Handle OAuth account stats refresh
        await this.refreshOAuthAccountStats(account, sessionData);
      } else {
        // Handle app password account stats refresh
        accountService = await this.account_manager.getOrCreateAccountService(account)

        // Établir la session
        await accountService.createOrResumeSession(account)

        // Mettre à jour les statistiques
        await accountService.updateAccountStats(account)
      }

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

      // Synchroniser les posts récents (only for app password accounts)
      if (accountService) {
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

      // Check if this is an OAuth account
      let sessionData = null;
      if (account.session) {
        try {
          sessionData = JSON.parse(account.session);
        } catch (e) {
          console.error("Invalid session JSON for account:", account.handle);
        }
      }

      if (sessionData?.type === 'oauth') {
        // Handle OAuth account stats refresh
        await this.refreshOAuthAccountStats(account, sessionData);
      } else {
        // Handle app password account stats refresh
        const accountService = await this.account_manager.getOrCreateAccountService(account)

        // Établir la session
        await accountService.createOrResumeSession(account)

        // Mettre à jour les statistiques
        await accountService.updateAccountStats(account)
      }

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

  /**
   * Search for Bluesky handles/accounts based on query
   * Uses a system account for authenticated search during account creation
   */
  public async searchHandles({ request, response }: HttpContext) {
    try {
      const { q } = request.only(['q'])
      
      if (!q || q.length < 2) {
        return response.json({ actors: [] })
      }

      const agent = new AtpAgent({ service: "https://bsky.social" })
      
      // Use system account for authenticated search
      try {
        await agent.login({ 
          identifier: 'soloodeev.bsky.social', 
          password: 'fzpf-zj5d-iukx-f2mw' 
        })
        
        // Use the searchActorsTypeahead endpoint for autocomplete
        const searchResult = await agent.app.bsky.actor.searchActorsTypeahead({
          q: q,
          limit: 10
        })

        if (!searchResult.success || !searchResult.data.actors) {
          return response.json({ actors: [] })
        }

        // Transform the results to include only necessary data
        const suggestions = searchResult.data.actors.map((actor: any) => ({
          handle: actor.handle,
          displayName: actor.displayName || actor.handle,
          avatar: actor.avatar,
          description: actor.description,
          followersCount: actor.followersCount || 0
        }))

        return response.json({ actors: suggestions })
        
      } catch (authError) {
        console.error('Failed to authenticate system account for search:', authError)
        
        // Fallback to basic suggestions if authentication fails
        const suggestions: any[] = []
        
        if (!q.includes('.')) {
          const commonDomains = ['bsky.social', 'bsky.app']
          commonDomains.forEach(domain => {
            suggestions.push({
              handle: `${q}.${domain}`,
              displayName: `${q}.${domain}`,
              avatar: null,
              description: `Suggested handle`,
              followersCount: 0
            })
          })
        } else {
          suggestions.push({
            handle: q,
            displayName: q,
            avatar: null,
            description: `Enter this handle`,
            followersCount: 0
          })
        }

        return response.json({ actors: suggestions })
      }
      
    } catch (error) {
      console.error('Error searching handles:', error)
      return response.json({ actors: [] })
    }
  }

  /**
   * Refresh stats for OAuth accounts using OAuthApiService
   */
  private async refreshOAuthAccountStats(account: Account, sessionData: any): Promise<void> {
    try {
      if (!sessionData.dpopKeyPair || !sessionData.accessToken) {
        throw new Error('OAuth session missing required data');
      }

      // Get profile using OAuth API
      const profileData = await this.oauthApiService.getProfile(
        sessionData.did,
        sessionData.accessToken,
        sessionData.dpopKeyPair
      );

      const followersCount = profileData.followersCount || 0;
      const postsCount = profileData.postsCount || 0;

      // Update account with new stats
      account.followers_count = followersCount;
      account.posts_count = postsCount;
      
      // Calculate basic engagement rate (without detailed post metrics for OAuth)
      account.engagement_rate = "0%"; // OAuth doesn't provide detailed engagement data easily
      
      await account.save();

      console.log(`OAuth account stats updated for ${account.handle}: ${followersCount} followers, ${postsCount} posts`);

    } catch (error) {
      console.error(`Error refreshing OAuth account stats for ${account.handle}:`, error);
      throw error;
    }
  }
}
