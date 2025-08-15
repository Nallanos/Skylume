import type { HttpContext } from '@adonisjs/core/http'
import ThreadsAccount from '#models/threads_account'
import env from '#start/env'
import { randomBytes } from 'crypto'

export default class ThreadsAuthController {
  /**
   * Initiate Threads OAuth flow
   */
  async initiateAuth({ request, response, auth, session }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      
      const clientId = env.get('THREADS_CLIENT_ID')
      const clientSecret = env.get('THREADS_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        throw new Error('Threads API credentials not configured')
      }
      
      // Get base URL - prefer APP_URL from environment for production/ngrok
      const appUrl = env.get('APP_URL')
      let baseUrl: string
      
      if (appUrl) {
        baseUrl = appUrl
      } else {
        const protocol = request.header('x-forwarded-proto') || (request.secure() ? 'https' : 'http')
        const host = request.header('host') || request.hostname()
        baseUrl = `${protocol}://${host}`
      }
      
      const redirectUri = `${baseUrl}/auth/threads/callback`
      const state = randomBytes(16).toString('hex')
      
      // Store verification data in session
      session.put('threads_state', state)
      session.put('threads_user_id', user.id)

      const authUrl = `https://threads.net/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('threads_basic,threads_content_publish')}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`

      console.log('🧵 Threads OAuth Flow Started')
      console.log('Auth URL:', authUrl)
      console.log('Redirect URI:', redirectUri)
      return response.redirect(authUrl)
    } catch (error) {
      console.error('❌ Threads auth initiation error:', error)
      session.flash('error', 'Failed to initiate Threads authentication')
      return response.redirect('/dashboard')
    }
  }

  /**
   * Handle Threads OAuth callback
   */
  async callback({ request, response, session }: HttpContext) {
    try {
      const { code, state, error, error_description } = request.qs()
      
      // Check for OAuth errors
      if (error) {
        console.error('❌ Threads OAuth error:', error, error_description)
        throw new Error(error_description || error)
      }
      
      if (!code) {
        throw new Error('No authorization code received')
      }
      
      const storedState = session.get('threads_state')
      const userId = session.get('threads_user_id')

      // Verify state parameter
      if (!storedState || !userId) {
        throw new Error('Invalid session state - please try again')
      }
      
      if (state !== storedState) {
        throw new Error('State parameter mismatch - possible CSRF attack')
      }

      // Get environment variables
      const clientId = env.get('THREADS_CLIENT_ID')
      const clientSecret = env.get('THREADS_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        throw new Error('Threads API credentials not configured')
      }
      
      // Get base URL - prefer APP_URL from environment for production/ngrok
      const appUrl = env.get('APP_URL')
      let baseUrl: string
      
      if (appUrl) {
        baseUrl = appUrl
      } else {
        const protocol = request.header('x-forwarded-proto') || (request.secure() ? 'https' : 'http')
        const host = request.header('host') || request.hostname()
        baseUrl = `${protocol}://${host}`
      }
      
      const redirectUri = `${baseUrl}/auth/threads/callback`

      console.log('🔄 Exchanging authorization code for access token')

      // Exchange code for access token
      const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('❌ Threads token exchange failed:', errorText)
        throw new Error('Failed to exchange code for tokens')
      }

      const tokens = await tokenResponse.json()
      const accessToken = tokens.access_token

      if (!accessToken) {
        console.error('❌ No access token received:', tokens)
        throw new Error('No access token received from Threads')
      }

      console.log('✅ Token exchange successful')

      // Get user info from Threads API
      const userResponse = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${accessToken}`)

      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('❌ Threads user data error:', errorText)
        throw new Error('Failed to get user information from Threads')
      }

      const userData = await userResponse.json()
      
      if (!userData.id || !userData.username) {
        console.error('❌ Invalid user data received:', userData)
        throw new Error('Invalid user data received from Threads')
      }

      console.log('✅ User data retrieved:', userData.username)

      // Check if account already exists
      const existingAccount = await ThreadsAccount.query()
        .where('user_id', userId)
        .where('threads_user_id', userData.id)
        .first()

      if (existingAccount) {
        // Update existing account
        await existingAccount.merge({
          accessToken: accessToken,
          username: userData.username,
          displayName: userData.name || null,
          profileImageUrl: userData.threads_profile_picture_url || null,
          bio: userData.threads_biography || null,
        }).save()
        
        console.log('✅ Updated existing Threads account')
      } else {
        // Create new account
        await ThreadsAccount.create({
          userId,
          threadsUserId: userData.id,
          username: userData.username,
          displayName: userData.name || null,
          accessToken,
          profileImageUrl: userData.threads_profile_picture_url || null,
          bio: userData.threads_biography || null,
          followersCount: 0, // Threads API doesn't provide follower counts in basic access
          followingCount: 0,
          postsCount: 0,
        })
        
        console.log('✅ Created new Threads account')
      }

      // Clear session data
      session.forget('threads_state')
      session.forget('threads_user_id')

      session.flash('success', `Threads account @${userData.username} connected successfully!`)
      return response.redirect('/dashboard')
    } catch (error) {
      console.error('❌ Threads auth callback error:', error)
      
      // Clear session data on error
      session.forget('threads_state')
      session.forget('threads_user_id')
      
      session.flash('error', `Threads authentication failed: ${error.message}`)
      return response.redirect('/dashboard')
    }
  }

  /**
   * Disconnect Threads account
   */
  async disconnect({ params, response, auth, session }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const accountId = params.id

      const account = await ThreadsAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      await account.delete()

      console.log('✅ Threads account disconnected')
      session.flash('success', 'Threads account disconnected successfully!')
      return response.redirect('/dashboard')
    } catch (error) {
      console.error('❌ Threads disconnect error:', error)
      session.flash('error', 'Failed to disconnect Threads account')
      return response.redirect('/dashboard')
    }
  }
}
