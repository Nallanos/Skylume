import { inject } from '@adonisjs/core'
import crypto from 'crypto'
import redis from '@adonisjs/redis/services/main'

interface DPoPKeyPair {
  privateKey: JsonWebKey & { kid?: string; alg?: string; use?: string }
  publicKey: JsonWebKey & { kid?: string; alg?: string; use?: string }
  keyId: string
}

interface OAuthRequestOptions {
  method: string
  url: string
  accessToken: string
  dpopKeyPair: DPoPKeyPair
  body?: string
  headers?: Record<string, string>
}

@inject()
export default class OAuthApiService {
  private readonly PDS_NONCE_PREFIX = 'pds_nonce:'
  
  /**
   * Create DPoP proof JWT for PDS requests
   */
  private async createDPoPProof(
    method: string,
    url: string,
    keyPair: DPoPKeyPair,
    accessToken: string,
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

    // Add access token hash (required for PDS requests)
    const hash = crypto.createHash('sha256').update(accessToken).digest()
    payload.ath = hash.toString('base64url')

    // Create JWT manually
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
   * Get stored DPoP nonce for PDS
   */
  private async getPDSNonce(): Promise<string | null> {
    try {
      return await redis.get(`${this.PDS_NONCE_PREFIX}current`)
    } catch (error) {
      console.error('Error getting PDS nonce:', error)
      return null
    }
  }

  /**
   * Store DPoP nonce for PDS
   */
  private async storePDSNonce(nonce: string): Promise<void> {
    try {
      await redis.setex(`${this.PDS_NONCE_PREFIX}current`, 3600, nonce) // 1 hour TTL
    } catch (error) {
      console.error('Error storing PDS nonce:', error)
    }
  }

  /**
   * Make an OAuth authenticated request to Bluesky PDS
   */
  async makeOAuthRequest(options: OAuthRequestOptions): Promise<Response> {
    const { method, url, accessToken, dpopKeyPair, body, headers = {} } = options
    
    let nonce = await this.getPDSNonce()
    let dpopProof = await this.createDPoPProof(method, url, dpopKeyPair, accessToken, nonce || undefined)

    const requestHeaders = {
      'Authorization': `DPoP ${accessToken}`,
      'DPoP': dpopProof,
      'Content-Type': 'application/json',
      ...headers,
    }

    let response = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
    })

    // Handle DPoP nonce requirement
    if (response.status === 401) {
      const wwwAuth = response.headers.get('WWW-Authenticate')
      if (wwwAuth && wwwAuth.includes('use_dpop_nonce')) {
        const newNonce = response.headers.get('DPoP-Nonce')
        if (newNonce) {
          console.log('Received new PDS DPoP nonce:', newNonce)
          await this.storePDSNonce(newNonce)
          
          // Create new DPoP proof with nonce
          dpopProof = await this.createDPoPProof(method, url, dpopKeyPair, accessToken, newNonce)
          
          // Retry request with nonce
          response = await fetch(url, {
            method,
            headers: {
              ...requestHeaders,
              'DPoP': dpopProof,
            },
            body,
          })
        }
      }
    }

    return response
  }

  /**
   * Get profile information using OAuth token
   */
  async getProfile(did: string, accessToken: string, dpopKeyPair: DPoPKeyPair): Promise<any> {
    const url = `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${did}`
    
    const response = await this.makeOAuthRequest({
      method: 'GET',
      url,
      accessToken,
      dpopKeyPair,
    })

    if (!response.ok) {
      throw new Error(`Failed to get profile: ${response.status} ${await response.text()}`)
    }

    return await response.json()
  }

  /**
   * Get user's posts using OAuth token
   */
  async getUserPosts(did: string, accessToken: string, dpopKeyPair: DPoPKeyPair, limit = 20): Promise<any> {
    const url = `https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=app.bsky.feed.post&limit=${limit}`
    
    const response = await this.makeOAuthRequest({
      method: 'GET',
      url,
      accessToken,
      dpopKeyPair,
    })

    if (!response.ok) {
      throw new Error(`Failed to get posts: ${response.status} ${await response.text()}`)
    }

    return await response.json()
  }

  /**
   * Create a post using OAuth token
   */
  async createPost(did: string, accessToken: string, dpopKeyPair: DPoPKeyPair, text: string): Promise<any> {
    const url = 'https://bsky.social/xrpc/com.atproto.repo.createRecord'
    
    const body = JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        text,
        createdAt: new Date().toISOString(),
        $type: 'app.bsky.feed.post',
      },
    })

    const response = await this.makeOAuthRequest({
      method: 'POST',
      url,
      accessToken,
      dpopKeyPair,
      body,
    })

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status} ${await response.text()}`)
    }

    return await response.json()
  }
}
