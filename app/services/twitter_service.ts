import { TwitterApi } from 'twitter-api-v2'
import Account from '#models/account'
import { DateTime } from 'luxon'

export interface TwitterPostOptions {
  text: string
  media?: string[]
  altTexts?: string[]
  contentWarnings?: string[]
}

export interface TwitterAuthResult {
  accessToken: string
  accessTokenSecret: string
  userId: string
  username: string
}

export default class TwitterService {
  private client: TwitterApi | null = null

  constructor(private account?: Account) {
    if (account?.twitterAccessToken && account?.twitterAccessTokenSecret) {
      // OAuth 1.0a for Account model
      this.initializeClient(account.twitterAccessToken, account.twitterAccessTokenSecret)
    }
  }

  /**
   * Create TwitterService instance for TwitterAccount model (OAuth 2.0)
   */
  static forTwitterAccount(twitterAccount: any): TwitterService {
    const service = new TwitterService()
    if (twitterAccount?.accessToken) {
      service.initializeClientBearer(twitterAccount.accessToken)
    }
    return service
  }

  /**
   * Initialize Twitter client with OAuth 1.0a credentials
   */
  private initializeClient(accessToken: string, accessTokenSecret: string): void {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken,
      accessSecret: accessTokenSecret,
    })
  }

  /**
   * Initialize Twitter client with OAuth 2.0 access token (user context)
   */
  private initializeClientBearer(accessToken: string): void {
    console.log('[TWITTER DEBUG] Initializing with access token:', accessToken.substring(0, 20) + '...')
    
    // For OAuth 2.0 user context, we need to verify the token format
    if (!accessToken || accessToken.length < 10) {
      throw new Error('Invalid access token provided')
    }
    
    this.client = new TwitterApi(accessToken)
    console.log('[TWITTER DEBUG] Client initialized successfully with bearer token')
  }

  /**
   * Get OAuth URL for Twitter authentication
   */
  public async getAuthURL(): Promise<{ url: string, oauthToken: string, oauthTokenSecret: string }> {
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
    })

    const authLink = await tempClient.generateAuthLink(
      process.env.TWITTER_CALLBACK_URL || 'http://localhost:3333/auth/twitter/callback'
    )

    return {
      url: authLink.url,
      oauthToken: authLink.oauth_token,
      oauthTokenSecret: authLink.oauth_token_secret
    }
  }

  /**
   * Complete OAuth flow and get access tokens
   */
  public async completeAuth(
    oauthToken: string, 
    oauthTokenSecret: string, 
    oauthVerifier: string
  ): Promise<TwitterAuthResult> {
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    })

    const { client: loggedClient, accessToken, accessSecret } = await tempClient.login(oauthVerifier)
    
    // Get user info
    const user = await loggedClient.v2.me()
    
    return {
      accessToken,
      accessTokenSecret: accessSecret,
      userId: user.data.id,
      username: user.data.username
    }
  }

  /**
   * Refresh expired access token using refresh token
   */
  public static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    const clientId = process.env.TWITTER_CLIENT_ID
    const clientSecret = process.env.TWITTER_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error('Twitter API credentials not configured')
    }

    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`)
      }

      const tokenData = await response.json()
      console.log('[TWITTER DEBUG] Token refreshed successfully')
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      }
    } catch (error) {
      console.error('[TWITTER] Error refreshing token:', error)
      throw error
    }
  }

  /**
   * Create TwitterService instance for TwitterAccount model with token refresh
   */
  static async forTwitterAccountWithRefresh(twitterAccount: any): Promise<TwitterService> {
    let accessToken = twitterAccount.accessToken
    
    // Try to use the token first
    try {
      const service = new TwitterService()
      service.initializeClientBearer(accessToken)
      
      // Verify the token works
      await service.client!.v2.me()
      return service
    } catch (error) {
      console.log('[TWITTER DEBUG] Access token failed, attempting refresh...')
      
      // If token fails and we have a refresh token, try to refresh
      if (twitterAccount.refreshToken) {
        try {
          const refreshResult = await TwitterService.refreshAccessToken(twitterAccount.refreshToken)
          
          // Update the account with new tokens
          await twitterAccount.merge({
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken
          }).save()
          
          const service = new TwitterService()
          service.initializeClientBearer(refreshResult.accessToken)
          return service
        } catch (refreshError) {
          console.error('[TWITTER] Token refresh failed:', refreshError)
          throw new Error('Twitter authentication expired and refresh failed')
        }
      }
      
      throw new Error('Twitter authentication failed and no refresh token available')
    }
  }

  /**
   * Post to Twitter
   */
  public async createPost(options: TwitterPostOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Twitter client not initialized')
    }

    try {
      console.log('[TWITTER DEBUG] About to post tweet with options:', {
        textLength: options.text.length,
        mediaCount: options.media?.length || 0,
        hasVideos: options.media?.some(path => this.getMimeType(path).startsWith('video/')) || false
      })

      // First, let's verify the client can access user info
      try {
        const userInfo = await this.client.v2.me()
        console.log('[TWITTER DEBUG] User verification successful:', userInfo.data.username)
      } catch (verifyError) {
        console.error('[TWITTER DEBUG] User verification failed:', verifyError)
        throw new Error(`Token verification failed: ${verifyError.message}`)
      }

      let mediaIds: string[] = []

      // Upload media if provided
      if (options.media && options.media.length > 0) {
        console.log('[TWITTER DEBUG] Starting media upload process...')
        mediaIds = await this.uploadMedia(options.media, options.altTexts)
        console.log(`[TWITTER DEBUG] Media upload completed: ${mediaIds.length}/${options.media.length} successful`)
      }

      // Create tweet
      const tweetData: any = {
        text: this.truncateText(options.text, 280) // Twitter character limit
      }

      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds }
        console.log(`[TWITTER DEBUG] Tweet will include ${mediaIds.length} media attachments`)
      } else if (options.media && options.media.length > 0) {
        console.log('[TWITTER INFO] Original media failed to upload, posting text-only tweet')
      }

      console.log('[TWITTER DEBUG] Sending tweet data:', { 
        textLength: tweetData.text.length, 
        mediaCount: mediaIds.length 
      })
      const result = await this.client.v2.tweet(tweetData)
      
      console.log('[TWITTER DEBUG] Tweet posted successfully:', result.data.id)
      return result.data.id
    } catch (error) {
      console.error('[TWITTER] Error posting tweet:', error)
      
      // Add more specific error information
      if (error.code === 401) {
        console.error('[TWITTER] 401 Error details:', {
          message: error.message,
          data: error.data,
          headers: error.headers
        })
        throw new Error('Twitter authentication failed - token may be expired or invalid')
      }
      
      throw error
    }
  }

  /**
   * Upload media to Twitter - Images only (videos disabled)
   */
  private async uploadMedia(mediaPaths: string[], altTexts?: string[]): Promise<string[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized')
    }

    const mediaIds: string[] = []
    const fs = await import('fs')

    for (let i = 0; i < mediaPaths.length; i++) {
      const mediaPath = mediaPaths[i]
      const altText = altTexts?.[i]

      try {
        const fullPath = `public${mediaPath}`
        if (fs.existsSync(fullPath)) {
          const mediaBuffer = fs.readFileSync(fullPath)
          const mimeType = this.getMimeType(mediaPath)
          
          console.log(`[TWITTER DEBUG] Processing media: ${mediaPath}, type: ${mimeType}, size: ${mediaBuffer.length} bytes`)
          
          if (mimeType.startsWith('video/')) {
            console.log(`[TWITTER INFO] Video uploads are disabled for Twitter - skipping ${mediaPath}`)
            continue // ✅ NOUVEAU: Skip vidéos complètement
          } else {
            // Images - utiliser le SDK (plus stable pour les images)
            try {
              const mediaId = await this.client.v1.uploadMedia(mediaBuffer, {
                mimeType: mimeType,
              })
              
              if (altText && altText.trim()) {
                await this.client.v1.createMediaMetadata(mediaId, { 
                  alt_text: { text: altText.trim() } 
                })
              }

              mediaIds.push(mediaId)
              console.log(`[TWITTER DEBUG] Image uploaded successfully: ${mediaId}`)
              
            } catch (imageError) {
              console.error(`[TWITTER ERROR] Failed to upload image ${mediaPath}:`, imageError)
            }
          }
        } else {
          console.error(`[TWITTER ERROR] Media file not found: ${fullPath}`)
        }
      } catch (error) {
        console.error(`[TWITTER ERROR] Error processing media ${mediaPath}:`, error)
      }
    }

    console.log(`[TWITTER DEBUG] Final result: ${mediaIds.length} media uploaded successfully`)
    return mediaIds
  }

  /**
   * Get user profile information
   */
  public async getProfile(): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized')
    }

    return await this.client.v2.me({ 
      'user.fields': ['public_metrics', 'profile_image_url', 'description'] 
    })
  }

  /**
   * Check rate limits
   */
  public async getRateLimits(): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized')
    }

    return await this.client.v1.rateLimitStatuses()
  }

  /**
   * Truncate text to fit Twitter's character limit
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength - 3) + '...'
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop()
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'webm': 'video/webm', // ✅ AJOUTÉ: Support WebM
      'avi': 'video/avi',   // ✅ AJOUTÉ: Support AVI
    }
    return mimeTypes[extension || ''] || 'image/jpeg'
  }

  /**
   * Update account rate limit status
   */
  public async updateAccountRateLimit(account: Account, error?: any): Promise<void> {
    try {
      if (error && error.code === 429) {
        account.twitterRateLimited = true
        const resetTime = error.rateLimit?.reset || Date.now() + (15 * 60 * 1000) // Default 15 min
        account.twitterRateLimitReset = DateTime.fromMillis(resetTime * 1000)
      } else {
        account.twitterRateLimited = false
        account.twitterRateLimitReset = null
      }
      await account.save()
    } catch (saveError) {
      console.error('[TWITTER] Error updating rate limit status:', saveError)
    }
  }
}
