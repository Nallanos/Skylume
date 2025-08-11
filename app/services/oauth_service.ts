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
  dpopKeyPair: DPoPKeyPair
  metadata?: Record<string, any>
}

interface DPoPKeyPair {
  privateKey: JsonWebKey & { kid?: string; alg?: string; use?: string }
  publicKey: JsonWebKey & { kid?: string; alg?: string; use?: string }
  keyId: string
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
   * Generate DPoP key pair for secure token exchange
   */
  private async generateDPoPKeyPair(): Promise<DPoPKeyPair> {
    // Generate ES256 key pair (ECDSA with P-256 curve)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable
      ['sign', 'verify']
    )

    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey) as JsonWebKey & { kid?: string; alg?: string; use?: string }
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey) as JsonWebKey & { kid?: string; alg?: string; use?: string }
    
    // Generate a key ID
    const keyId = crypto.randomBytes(16).toString('hex')
    
    // Add required JWK fields
    publicKey.kid = keyId
    publicKey.alg = 'ES256'
    publicKey.use = 'sig'
    
    privateKey.kid = keyId
    privateKey.alg = 'ES256'
    privateKey.use = 'sig'

    return {
      privateKey,
      publicKey,
      keyId,
    }
  }

  /**
   * Create DPoP proof JWT
   */
  private async createDPoPProof(
    method: string,
    url: string,
    keyPair: DPoPKeyPair,
    accessToken?: string,
    nonce?: string
  ): Promise<string> {
    const header = {
      typ: 'dpop+jwt',
      alg: 'ES256',
      jwk: keyPair.publicKey,
    }

    const payload: any = {
      jti: crypto.randomBytes(16).toString('hex'),
      htm: method,
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    }

    // Add nonce if provided
    if (nonce) {
      payload.nonce = nonce
    }

    // Add access token hash if provided (for protected resource requests)
    if (accessToken) {
      const hash = crypto.createHash('sha256').update(accessToken).digest()
      payload.ath = hash.toString('base64url')
    }

    // Create JWT manually (since we need specific crypto operations)
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signingInput = `${encodedHeader}.${encodedPayload}`

    // Import the private key for signing
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      keyPair.privateKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    )

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      cryptoKey,
      new TextEncoder().encode(signingInput)
    )

    const encodedSignature = Buffer.from(signature).toString('base64url')
    return `${signingInput}.${encodedSignature}`
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
        parEndpoint: discovery.pushed_authorization_request_endpoint,
        issuer: discovery.issuer,
      }
    } catch (error) {
      console.error('Failed to discover OAuth endpoints:', error)
      // Fallback to known endpoints
      return {
        authorizationEndpoint: `${this.BLUESKY_PDS}/oauth/authorize`,
        tokenEndpoint: `${this.BLUESKY_PDS}/oauth/token`,
        parEndpoint: `${this.BLUESKY_PDS}/oauth/par`,
        issuer: this.BLUESKY_PDS,
      }
    }
  }

  /**
   * Initiate OAuth authorization flow using PAR (Pushed Authorization Requests)
   */
  async initiateAuthFlow({ response, session }: HttpContext): Promise<void> {
    try {
      console.log('OAuth initiateAuthFlow started')
      const pkce = this.generatePKCEChallenge()
      const dpopKeyPair = await this.generateDPoPKeyPair()
      
      console.log('PKCE generated:', { state: pkce.state })
      
      const endpoints = await this.discoverOAuthEndpoints()
      console.log('OAuth endpoints discovered:', endpoints)
      
      const appUrl = env.get('APP_URL')
      const clientId = `${appUrl}/.well-known/oauth_client`
      const redirectUri = `${appUrl}/oauth/callback`
      
      console.log('OAuth config:', { appUrl, clientId, redirectUri })
      
      // Store PKCE and DPoP data in Redis with expiration (10 minutes)
      const sessionData = {
        codeVerifier: pkce.codeVerifier,
        state: pkce.state,
        dpopKeyPair,
        dpopNonce: null as string | null, // Will be updated if server requires nonce
      }
      
      await redis.setex(`${this.PKCE_PREFIX}${pkce.state}`, 600, JSON.stringify(sessionData))
      console.log('PKCE and DPoP data stored in Redis')

      // Create DPoP proof for PAR request (initial attempt without nonce)
      let dpopProof = await this.createDPoPProof('POST', endpoints.parEndpoint, dpopKeyPair)

      // Step 1: Make PAR request with DPoP
      const parParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'atproto transition:generic',
        state: pkce.state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: 'S256',
      })

      console.log('Making PAR request to:', endpoints.parEndpoint)
      
      let parResponse = await fetch(endpoints.parEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'DPoP': dpopProof,
        },
        body: parParams.toString(),
      })

      // Handle DPoP nonce requirement
      if (!parResponse.ok && parResponse.status === 400) {
        const errorData = await parResponse.json()
        if (errorData.error === 'use_dpop_nonce') {
          console.log('DPoP nonce required, retrying with nonce...')
          
          // Extract nonce from DPoP-Nonce header
          const dpopNonce = parResponse.headers.get('DPoP-Nonce')
          if (dpopNonce) {
            console.log('Received DPoP nonce:', dpopNonce)
            
            // Update session data with nonce for token exchange
            sessionData.dpopNonce = dpopNonce
            await redis.setex(`${this.PKCE_PREFIX}${pkce.state}`, 600, JSON.stringify(sessionData))
            
            // Create new DPoP proof with nonce
            dpopProof = await this.createDPoPProof('POST', endpoints.parEndpoint, dpopKeyPair, undefined, dpopNonce)
            
            // Retry PAR request with nonce
            parResponse = await fetch(endpoints.parEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpopProof,
              },
              body: parParams.toString(),
            })
          }
        }
      }

      if (!parResponse.ok) {
        const errorText = await parResponse.text()
        console.error('PAR request failed:', parResponse.status, errorText)
        throw new Error(`PAR request failed: ${parResponse.status} - ${errorText}`)
      }

      const parData = await parResponse.json()
      console.log('PAR response:', parData)

      // Step 2: Redirect to authorization endpoint with request_uri
      const authParams = new URLSearchParams({
        client_id: clientId,
        request_uri: parData.request_uri,
      })

      const authUrl = `${endpoints.authorizationEndpoint}?${authParams.toString()}`
      
      console.log('OAuth Authorization URL:', authUrl)
      console.log('Client ID:', clientId)
      console.log('Redirect URI:', redirectUri)
      
      console.log('Redirecting to:', authUrl)
      response.redirect(authUrl)
    } catch (error) {
      console.error('Error initiating OAuth flow:', error)
      session.flash('errors.oauth', 'Failed to initiate OAuth flow. Please try again.')
      response.redirect('/')
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
      const sessionData = await redis.get(`${this.PKCE_PREFIX}${state}`)
      if (!sessionData) {
        session.flash('errors.oauth', 'Invalid or expired OAuth state')
        return null
      }

      const { codeVerifier, dpopKeyPair, dpopNonce } = JSON.parse(sessionData)
      const endpoints = await this.discoverOAuthEndpoints()
      
      const appUrl = env.get('APP_URL')
      const clientId = `${appUrl}/.well-known/oauth_client`
      const redirectUri = `${appUrl}/oauth/callback`

      // Create DPoP proof for token exchange (use stored nonce if available)
      let dpopProof = await this.createDPoPProof('POST', endpoints.tokenEndpoint, dpopKeyPair, undefined, dpopNonce)

      // Exchange code for tokens with DPoP
      let tokenResponse = await fetch(endpoints.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'DPoP': dpopProof,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          code_verifier: codeVerifier,
        }),
      })

      // Handle DPoP nonce requirement for token exchange
      if (!tokenResponse.ok && tokenResponse.status === 400) {
        const errorData = await tokenResponse.json()
        if (errorData.error === 'use_dpop_nonce') {
          console.log('DPoP nonce required for token exchange, retrying with nonce...')
          
          // Extract nonce from DPoP-Nonce header
          const dpopNonce = tokenResponse.headers.get('DPoP-Nonce')
          if (dpopNonce) {
            console.log('Received DPoP nonce for token exchange:', dpopNonce)
            
            // Create new DPoP proof with nonce
            dpopProof = await this.createDPoPProof('POST', endpoints.tokenEndpoint, dpopKeyPair, undefined, dpopNonce)
            
            // Retry token request with nonce
            tokenResponse = await fetch(endpoints.tokenEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpopProof,
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: codeVerifier,
              }),
            })
          }
        }
      }

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', errorData)
        session.flash('errors.oauth', 'Failed to exchange authorization code for tokens')
        return null
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful:', { 
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_in: tokenData.expires_in 
      })

      // Clean up PKCE data
      await redis.del(`${this.PKCE_PREFIX}${state}`)

      // Extract session data
      const sessionDataResult: OAuthSessionData = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        did: tokenData.sub || '', // DID should be in 'sub' claim
        handle: '', // Will be populated after profile fetch
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        dpopKeyPair, // Include the DPoP key pair for API requests
        metadata: {
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
        },
      }

      return sessionDataResult
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
