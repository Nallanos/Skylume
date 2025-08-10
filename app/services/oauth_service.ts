import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import crypto from 'crypto'
import env from '#start/env'
import redis from '@adonisjs/redis/services/main'

interface PKCEChallenge {
  codeVerifier: string
  codeChallenge: string
  state: string
}

interface OAuthSessionData {
  accessToken: string
  refreshToken?: string
  did: string
  handle: string
  expiresAt: Date
  metadata?: Record<string, any>
}

@inject()
export default class OAuthService {
  private readonly OAUTH_SESSION_PREFIX = 'oauth_session:'
  private readonly PKCE_PREFIX = 'pkce:'
  private readonly BLUESKY_PDS = 'https://bsky.social'

  /**
   * Generate PKCE challenge for OAuth flow
   */
  private generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const state = crypto.randomBytes(16).toString('hex')

    return {
      codeVerifier,
      codeChallenge,
      state,
    }
  }

  /**
   * Discover OAuth endpoints from Bluesky
   */
  private async discoverOAuthEndpoints() {
    try {
      // Use Bluesky's OAuth discovery endpoint
      const discoveryUrl = `${this.BLUESKY_PDS}/.well-known/oauth-authorization-server`
      const response = await fetch(discoveryUrl)
      
      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.status}`)
      }
      
      const discovery = await response.json()
      
      return {
        authorizationEndpoint: discovery.authorization_endpoint,
        tokenEndpoint: discovery.token_endpoint,
        issuer: discovery.issuer,
      }
    } catch (error) {
      console.error('Failed to discover OAuth endpoints:', error)
      // Fallback to known endpoints
      return {
        authorizationEndpoint: `${this.BLUESKY_PDS}/oauth/authorize`,
        tokenEndpoint: `${this.BLUESKY_PDS}/oauth/token`,
        issuer: this.BLUESKY_PDS,
      }
    }
  }

  /**
   * Initiate OAuth authorization flow
   */
  async initiateAuthFlow({ response, session }: HttpContext): Promise<void> {
    try {
      const pkce = this.generatePKCEChallenge()
      const endpoints = await this.discoverOAuthEndpoints()
      
      // Store PKCE data in Redis with expiration (10 minutes)
      await redis.setex(`${this.PKCE_PREFIX}${pkce.state}`, 600, JSON.stringify({
        codeVerifier: pkce.codeVerifier,
        state: pkce.state,
      }))

      // Build authorization URL
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: env.get('BLUESKY_OAUTH_CLIENT_ID', 'https://bluesky-copilot.example.com'),
        redirect_uri: env.get('BLUESKY_OAUTH_REDIRECT_URI', 'http://127.0.0.1:8081/oauth/callback'),
        scope: 'atproto transition:generic transition:chat.bsky.convo',
        state: pkce.state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: 'S256',
      })

      const authUrl = `${endpoints.authorizationEndpoint}?${authParams.toString()}`
      response.redirect(authUrl)
    } catch (error) {
      console.error('Error initiating OAuth flow:', error)
      session.flash('errors.oauth', 'Failed to initiate OAuth flow. Please try again.')
      response.redirect().back()
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    { request, session }: HttpContext
  ): Promise<OAuthSessionData | null> {
    try {
      const { code, state, error } = request.qs()

      if (error) {
        console.error('OAuth error:', error)
        session.flash('errors.oauth', `OAuth error: ${error}`)
        return null
      }

      if (!code || !state) {
        session.flash('errors.oauth', 'Missing authorization code or state parameter')
        return null
      }

      // Retrieve PKCE data from Redis
      const pkceData = await redis.get(`${this.PKCE_PREFIX}${state}`)
      if (!pkceData) {
        session.flash('errors.oauth', 'Invalid or expired OAuth state')
        return null
      }

      const { codeVerifier } = JSON.parse(pkceData)
      const endpoints = await this.discoverOAuthEndpoints()

      // Exchange code for tokens
      const tokenResponse = await fetch(endpoints.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.get('BLUESKY_OAUTH_REDIRECT_URI', 'http://127.0.0.1:8081/oauth/callback'),
          client_id: env.get('BLUESKY_OAUTH_CLIENT_ID', 'https://bluesky-copilot.example.com'),
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', errorData)
        session.flash('errors.oauth', 'Failed to exchange authorization code for tokens')
        return null
      }

      const tokenData = await tokenResponse.json()

      // Clean up PKCE data
      await redis.del(`${this.PKCE_PREFIX}${state}`)

      // Extract session data
      const sessionData: OAuthSessionData = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        did: tokenData.sub || '', // DID should be in 'sub' claim
        handle: '', // Will be populated after profile fetch
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        metadata: {
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
        },
      }

      return sessionData
    } catch (error) {
      console.error('OAuth callback error:', error)
      session.flash('errors.oauth', 'Failed to complete OAuth flow. Please try again.')
      return null
    }
  }

  /**
   * Store OAuth session data securely
   */
  async storeOAuthSession(userId: string, sessionData: OAuthSessionData): Promise<void> {
    try {
      // Encrypt sensitive data before storing
      const encryptedData = this.encryptSessionData(sessionData)
      
      // Store in Redis with expiration
      const ttl = Math.floor((sessionData.expiresAt.getTime() - Date.now()) / 1000)
      await redis.setex(`${this.OAUTH_SESSION_PREFIX}${userId}`, ttl, JSON.stringify(encryptedData))
    } catch (error) {
      console.error('Error storing OAuth session:', error)
      throw error
    }
  }

  /**
   * Retrieve OAuth session data
   */
  async getOAuthSession(userId: string): Promise<OAuthSessionData | null> {
    try {
      const sessionData = await redis.get(`${this.OAUTH_SESSION_PREFIX}${userId}`)
      if (!sessionData) {
        return null
      }

      const decryptedData = this.decryptSessionData(JSON.parse(sessionData))
      return decryptedData
    } catch (error) {
      console.error('Error retrieving OAuth session:', error)
      return null
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(userId: string): Promise<OAuthSessionData | null> {
    try {
      const currentSession = await this.getOAuthSession(userId)
      if (!currentSession || !currentSession.refreshToken) {
        return null
      }

      const endpoints = await this.discoverOAuthEndpoints()

      const refreshResponse = await fetch(endpoints.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentSession.refreshToken,
          client_id: env.get('BLUESKY_OAUTH_CLIENT_ID', 'https://bluesky-copilot.example.com'),
        }),
      })

      if (!refreshResponse.ok) {
        console.error('Token refresh failed')
        return null
      }

      const tokenData = await refreshResponse.json()

      const updatedSession: OAuthSessionData = {
        ...currentSession,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || currentSession.refreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
      }

      await this.storeOAuthSession(userId, updatedSession)
      return updatedSession
    } catch (error) {
      console.error('Error refreshing tokens:', error)
      return null
    }
  }

  /**
   * Revoke OAuth session
   */
  async revokeSession(userId: string): Promise<void> {
    try {
      await redis.del(`${this.OAUTH_SESSION_PREFIX}${userId}`)
    } catch (error) {
      console.error('Error revoking OAuth session:', error)
      throw error
    }
  }

  /**
   * Encrypt session data
   */
  private encryptSessionData(data: OAuthSessionData): any {
    const key = env.get('APP_KEY')
    const algorithm = 'aes-256-gcm'
    
    const cipher = crypto.createCipher(algorithm, key)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return {
      encrypted,
      algorithm,
    }
  }

  /**
   * Decrypt session data
   */
  private decryptSessionData(encryptedData: any): OAuthSessionData {
    const key = env.get('APP_KEY')
    const { encrypted, algorithm } = encryptedData
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }

  /**
   * Validate identifier format (handle vs email)
   */
  validateIdentifier(identifier: string): { type: 'handle' | 'email' | 'unknown'; isValid: boolean } {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(identifier)) {
      return { type: 'email', isValid: true }
    }

    // Bluesky handle validation (handle.domain or @handle.domain)
    const handleRegex = /^@?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (handleRegex.test(identifier)) {
      return { type: 'handle', isValid: true }
    }

    return { type: 'unknown', isValid: false }
  }

  /**
   * Detect authentication method based on input format
   */
  detectAuthMethod(identifier: string, password: string): 'oauth' | 'app_password' | 'classic_password' {
    // App password detection (typically 19 characters with specific format)
    const appPasswordRegex = /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{6}$/
    if (appPasswordRegex.test(password)) {
      return 'app_password'
    }

    // If identifier is an email, likely classic password
    const { type } = this.validateIdentifier(identifier)
    if (type === 'email') {
      return 'classic_password'
    }

    // Default to app password for handles
    return 'app_password'
  }
}
