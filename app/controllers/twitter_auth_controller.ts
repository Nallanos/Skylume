import type { HttpContext } from '@adonisjs/core/http'
import TwitterAccount from '#models/twitter_account'
import env from '#start/env'
import { createHash, randomBytes } from 'crypto'

export default class TwitterAuthController {
  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePKCE() {
    // Generate code verifier (43-128 characters, URL-safe)
    const codeVerifier = randomBytes(32).toString('base64url')
    
    // Generate code challenge (SHA256 hash of verifier)
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    
    return { codeVerifier, codeChallenge }
  }

  /**
   * Initiate Twitter OAuth flow
   */
  async initiateAuth({ request, response, auth, session }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      
      // Get environment variables
      const clientId = env.get('TWITTER_CLIENT_ID')
      const clientSecret = env.get('TWITTER_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        throw new Error('Twitter API credentials not configured')
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
      
      const redirectUri = `${baseUrl}/auth/twitter/callback`
      const state = randomBytes(16).toString('hex')
      
      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = this.generatePKCE()
      
      // Store verification data in session
      session.put('twitter_state', state)
      session.put('twitter_code_verifier', codeVerifier)
      session.put('twitter_user_id', user.id)

      const authUrl = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&` +
        `state=${encodeURIComponent(state)}&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256`

      console.log('🐦 Twitter OAuth Flow Started')
      console.log('Auth URL:', authUrl)
      console.log('Redirect URI:', redirectUri)
      console.log('Code Challenge Method: S256')
      return response.redirect(authUrl)
    } catch (error) {
      console.error('Twitter auth initiation error:', error)
      session.flash('error', 'Failed to initiate Twitter authentication')
      return response.redirect('/dashboard')
    }
  }

  /**
   * Handle Twitter OAuth callback
   */
  async callback({ request, response, session }: HttpContext) {
    try {
      const { code, state, error, error_description } = request.qs()
      
      // Check for OAuth errors
      if (error) {
        console.error('❌ Twitter OAuth error:', error, error_description)
        throw new Error(error_description || error)
      }
      
      if (!code) {
        throw new Error('No authorization code received')
      }
      
      // Verify state parameter
      const storedState = session.get('twitter_state')
      const codeVerifier = session.get('twitter_code_verifier')
      const userId = session.get('twitter_user_id')
      
      if (!storedState || !codeVerifier || !userId) {
        throw new Error('Invalid session state - please try again')
      }
      
      if (state !== storedState) {
        throw new Error('State parameter mismatch - possible CSRF attack')
      }
      
      // Get environment variables
      const clientId = env.get('TWITTER_CLIENT_ID')
      const clientSecret = env.get('TWITTER_CLIENT_SECRET')
      
      if (!clientId || !clientSecret) {
        throw new Error('Twitter API credentials not configured')
      }
      
      // Get base URL more reliably
      const protocol = request.header('x-forwarded-proto') || (request.secure() ? 'https' : 'http')
      const host = request.header('host') || request.hostname()
      const baseUrl = `${protocol}://${host}`
      
      const redirectUri = `${baseUrl}/auth/twitter/callback`
      
      console.log('🔄 Exchanging authorization code for access token')
      
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      })

      const tokenData = await tokenResponse.json()
      
      if (!tokenResponse.ok) {
        console.error('❌ Twitter token exchange error:', tokenData)
        throw new Error(tokenData.error_description || 'Token exchange failed')
      }

      console.log('✅ Token exchange successful')

      // Get user information with expanded fields
      const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })

      const userData = await userResponse.json()
      
      if (!userResponse.ok) {
        console.error('❌ Twitter user data error:', userData)
        throw new Error('Failed to get user data')
      }

      console.log('✅ User data retrieved:', userData.data?.username)

      // Check if account already exists
      const existingAccount = await TwitterAccount.query()
        .where('user_id', userId)
        .where('twitter_user_id', userData.data.id)
        .first()

      if (existingAccount) {
        // Update existing account with new tokens
        await existingAccount.merge({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          followersCount: userData.data.public_metrics?.followers_count || 0,
          followingCount: userData.data.public_metrics?.following_count || 0,
          postsCount: userData.data.public_metrics?.tweet_count || 0,
          profileImageUrl: userData.data.profile_image_url,
          isRateLimited: false
        }).save()
        
        console.log('✅ Updated existing Twitter account')
      } else {
        // Save new Twitter account
        await TwitterAccount.create({
          userId: userId,
          twitterUserId: userData.data.id,
          username: userData.data.username,
          displayName: userData.data.name,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          followersCount: userData.data.public_metrics?.followers_count || 0,
          followingCount: userData.data.public_metrics?.following_count || 0,
          postsCount: userData.data.public_metrics?.tweet_count || 0,
          profileImageUrl: userData.data.profile_image_url,
          isRateLimited: false
        })
        
        console.log('✅ Created new Twitter account')
      }

      // Clear session data
      session.forget('twitter_state')
      session.forget('twitter_code_verifier')
      session.forget('twitter_user_id')

      session.flash('success', `Twitter account @${userData.data.username} connected successfully!`)
      return response.redirect('/dashboard')
    } catch (error) {
      console.error('❌ Twitter auth callback error:', error)
      
      // Clear session data on error
      session.forget('twitter_state')
      session.forget('twitter_code_verifier')
      session.forget('twitter_user_id')
      
      session.flash('error', `Twitter authentication failed: ${error.message}`)
      return response.redirect('/dashboard')
    }
  }  /**
   * Disconnect Twitter account
   */
  async disconnect({ params, response, auth, session }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const accountId = params.id

      const account = await TwitterAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      await account.delete()

      console.log('✅ Twitter account disconnected')
      session.flash('success', 'Twitter account disconnected successfully!')
      return response.redirect('/dashboard')
    } catch (error) {
      console.error('❌ Twitter disconnect error:', error)
      session.flash('error', 'Failed to disconnect Twitter account')
      return response.redirect('/dashboard')
    }
  }
}
