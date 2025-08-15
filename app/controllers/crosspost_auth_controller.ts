import { HttpContext } from '@adonisjs/core/http'
import TwitterService from '#services/twitter_service'
import ThreadsService from '#services/threads_service'
import Account from '#models/account'
import { inject } from '@adonisjs/core'

@inject()
export default class CrosspostAuthController {
  /**
   * Initiate Twitter OAuth flow
   */
  public async twitterAuth({ response, session }: HttpContext) {
    try {
      const twitterService = new TwitterService()
      const authData = await twitterService.getAuthURL()
      
      // Store OAuth tokens in session for later use
      session.put('twitter_oauth_token', authData.oauthToken)
      session.put('twitter_oauth_token_secret', authData.oauthTokenSecret)
      
      return response.redirect(authData.url)
    } catch (error) {
      console.error('[TWITTER_AUTH] Error initiating OAuth:', error)
      session.flash('error', 'Failed to connect to Twitter. Please try again.')
      return response.redirect('/settings/connected-accounts')
    }
  }

  /**
   * Handle Twitter OAuth callback
   */
  public async twitterCallback({ request, response, session, auth }: HttpContext) {
    try {
      const { oauth_token, oauth_verifier } = request.qs()
      
      if (!oauth_token || !oauth_verifier) {
        throw new Error('Missing OAuth parameters')
      }

      // Get stored OAuth tokens from session
      const oauthTokenSecret = session.get('twitter_oauth_token_secret')
      if (!oauthTokenSecret) {
        throw new Error('OAuth token secret not found in session')
      }

      // Complete OAuth flow
      const twitterService = new TwitterService()
      const authResult = await twitterService.completeAuth(
        oauth_token,
        oauthTokenSecret,
        oauth_verifier
      )

      // Get current user
      const user = await auth.authenticate()
      
      // Find or create Twitter account entry
      let account = await Account.query()
        .where('user_id', user.id)
        .where('platform', 'twitter')
        .first()

      if (!account) {
        account = await Account.create({
          userId: user.id,
          platform: 'twitter',
          handle: authResult.username,
          twitterAccessToken: authResult.accessToken,
          twitterAccessTokenSecret: authResult.accessTokenSecret,
          twitterUserId: authResult.userId,
          twitterUsername: authResult.username,
        })
      } else {
        // Update existing account
        account.twitterAccessToken = authResult.accessToken
        account.twitterAccessTokenSecret = authResult.accessTokenSecret
        account.twitterUserId = authResult.userId
        account.twitterUsername = authResult.username
        await account.save()
      }

      // Clean up session
      session.forget('twitter_oauth_token')
      session.forget('twitter_oauth_token_secret')

      session.flash('success', `Twitter account @${authResult.username} connected successfully!`)
      return response.redirect('/settings/connected-accounts')
    } catch (error) {
      console.error('[TWITTER_CALLBACK] Error:', error)
      session.flash('error', 'Failed to connect Twitter account. Please try again.')
      return response.redirect('/settings/connected-accounts')
    }
  }

  /**
   * Initiate Threads OAuth flow
   */
  public async threadsAuth({ response, session }: HttpContext) {
    try {
      const threadsService = new ThreadsService()
      const authData = await threadsService.getAuthURL()
      
      // Store state in session for security
      session.put('threads_oauth_state', authData.state)
      
      return response.redirect(authData.url)
    } catch (error) {
      console.error('[THREADS_AUTH] Error initiating OAuth:', error)
      session.flash('error', 'Failed to connect to Threads. Please try again.')
      return response.redirect('/settings/connected-accounts')
    }
  }

  /**
   * Handle Threads OAuth callback
   */
  public async threadsCallback({ request, response, session, auth }: HttpContext) {
    try {
      const { code, state } = request.qs()
      
      if (!code || !state) {
        throw new Error('Missing OAuth parameters')
      }

      // Verify state parameter
      const storedState = session.get('threads_oauth_state')
      if (state !== storedState) {
        throw new Error('Invalid OAuth state parameter')
      }

      // Complete OAuth flow
      const threadsService = new ThreadsService()
      const authResult = await threadsService.completeAuth(code, state)

      // Get current user
      const user = await auth.authenticate()
      
      // Find or create Threads account entry
      let account = await Account.query()
        .where('user_id', user.id)
        .where('platform', 'threads')
        .first()

      if (!account) {
        account = await Account.create({
          userId: user.id,
          platform: 'threads',
          handle: authResult.username,
          threadsAccessToken: authResult.accessToken,
          threadsUserId: authResult.userId,
          threadsUsername: authResult.username,
        })
      } else {
        // Update existing account
        account.threadsAccessToken = authResult.accessToken
        account.threadsUserId = authResult.userId
        account.threadsUsername = authResult.username
        await account.save()
      }

      // Clean up session
      session.forget('threads_oauth_state')

      session.flash('success', `Threads account @${authResult.username} connected successfully!`)
      return response.redirect('/settings/connected-accounts')
    } catch (error) {
      console.error('[THREADS_CALLBACK] Error:', error)
      session.flash('error', 'Failed to connect Threads account. Please try again.')
      return response.redirect('/settings/connected-accounts')
    }
  }

  /**
   * Disconnect Twitter account
   */
  public async disconnectTwitter({ auth, response, session }: HttpContext) {
    try {
      const user = await auth.authenticate()
      
      const account = await Account.query()
        .where('user_id', user.id)
        .where('platform', 'twitter')
        .first()

      if (account) {
        // Clear Twitter credentials
        account.twitterAccessToken = null
        account.twitterAccessTokenSecret = null
        account.twitterUserId = null
        account.twitterUsername = null
        await account.save()

        session.flash('success', 'Twitter account disconnected successfully.')
      } else {
        session.flash('error', 'No Twitter account found to disconnect.')
      }

      return response.redirect('/settings/connected-accounts')
    } catch (error) {
      console.error('[DISCONNECT_TWITTER] Error:', error)
      session.flash('error', 'Failed to disconnect Twitter account.')
      return response.redirect('/settings/connected-accounts')
    }
  }

  /**
   * Disconnect Threads account
   */
  public async disconnectThreads({ auth, response, session }: HttpContext) {
    try {
      const user = await auth.authenticate()
      
      const account = await Account.query()
        .where('user_id', user.id)
        .where('platform', 'threads')
        .first()

      if (account) {
        // Clear Threads credentials
        account.threadsAccessToken = null
        account.threadsUserId = null
        account.threadsUsername = null
        await account.save()

        session.flash('success', 'Threads account disconnected successfully.')
      } else {
        session.flash('error', 'No Threads account found to disconnect.')
      }

      return response.redirect('/settings/connected-accounts')
    } catch (error) {
      console.error('[DISCONNECT_THREADS] Error:', error)
      session.flash('error', 'Failed to disconnect Threads account.')
      return response.redirect('/settings/connected-accounts')
    }
  }
}
