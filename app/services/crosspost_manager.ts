import Scheduling from '#models/scheduling'
import Account from '#models/account'
import AccountManager from '#services/account_manager'
import TwitterService from '#services/twitter_service'
import { inject } from '@adonisjs/core'

export interface PostResult {
  platform: string
  success: boolean
  postId?: string
  error?: string
}

export interface CrosspostOptions {
  message: string
  images?: string[]
  videos?: string[]
  altTexts?: string[]
  videoAltTexts?: string[]
  contentWarnings?: string[]
}

@inject()
export default class CrosspostManager {
  
  constructor(protected accountManager: AccountManager) {}

  /**
   * Post to multiple platforms based on scheduling configuration
   */
  public async crosspost(scheduling: Scheduling, account: Account): Promise<PostResult[]> {
    const results: PostResult[] = []
    const platforms = scheduling.getCrosspostPlatforms()
    
    if (!scheduling.enableCrosspost || platforms.length === 0) {
      // Default to Bluesky only
      const result = await this.postToBluesky(scheduling, account)
      results.push(result)
      return results
    }

    // Post to each configured platform
    for (const platform of platforms) {
      try {
        let result: PostResult

        switch (platform) {
          case 'bluesky':
            result = await this.postToBluesky(scheduling, account)
            break
          case 'twitter':
            result = await this.postToTwitter(scheduling, account)
            break
          default:
            result = {
              platform,
              success: false,
              error: `Unknown platform: ${platform}`
            }
        }

        results.push(result)
        
        // Update scheduling with result
        if (result.success && result.postId) {
          scheduling.updatePlatformStatus(platform, 'posted')
          scheduling.updatePlatformPostId(platform, result.postId)
        } else {
          scheduling.updatePlatformStatus(platform, 'failed')
          scheduling.updatePlatformError(platform, result.error || 'Unknown error')
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          platform,
          success: false,
          error: errorMessage
        })
        
        scheduling.updatePlatformStatus(platform, 'failed')
        scheduling.updatePlatformError(platform, errorMessage)
      }
    }

    // Save scheduling updates
    await scheduling.save()
    
    return results
  }

  /**
   * Post to Bluesky using existing AccountService
   */
  private async postToBluesky(scheduling: Scheduling, account: Account): Promise<PostResult> {
    try {
      const accountService = await this.accountManager.getOrCreateAccountService(account)
      
      const options: CrosspostOptions = {
        message: scheduling.message,
        images: scheduling.hasImages() ? JSON.parse(scheduling.images) : [],
        videos: scheduling.hasVideos() ? JSON.parse(scheduling.videos) : [],
        altTexts: Array.isArray(scheduling.altTexts) ? scheduling.altTexts : JSON.parse(scheduling.altTexts || '[]'),
        videoAltTexts: Array.isArray(scheduling.videoAltTexts) ? scheduling.videoAltTexts : JSON.parse(scheduling.videoAltTexts || '[]'),
        contentWarnings: Array.isArray(scheduling.contentWarnings) ? scheduling.contentWarnings : JSON.parse(scheduling.contentWarnings || '[]')
      }

      let result: any

      if (options.images && options.images.length > 0) {
        result = await accountService.postWithImagePaths(
          account,
          options.message,
          options.images,
          options.altTexts,
          options.contentWarnings as any
        )
      } else if (options.videos && options.videos.length > 0) {
        // Handle video posting - this would need to be implemented in AccountService
        result = await accountService.post(account, options.message, [], [], options.contentWarnings)
      } else {
        result = await accountService.post(account, options.message, [], [], options.contentWarnings)
      }

      return {
        platform: 'bluesky',
        success: true,
        postId: result.uri || result.cid
      }
    } catch (error) {
      return {
        platform: 'bluesky',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Post to Twitter
   */
  private async postToTwitter(scheduling: Scheduling, account: Account): Promise<PostResult> {
    try {
      const twitterService = new TwitterService(account)
      
      const options = {
        text: scheduling.message,
        media: scheduling.hasImages() ? JSON.parse(scheduling.images) : [],
        altTexts: Array.isArray(scheduling.altTexts) ? scheduling.altTexts : JSON.parse(scheduling.altTexts || '[]'),
        contentWarnings: Array.isArray(scheduling.contentWarnings) ? scheduling.contentWarnings : JSON.parse(scheduling.contentWarnings || '[]')
      }

      const postId = await twitterService.createPost(options)
      await twitterService.updateAccountRateLimit(account)

      return {
        platform: 'twitter',
        success: true,
        postId
      }
    } catch (error) {
      await new TwitterService().updateAccountRateLimit(account, error)
      return {
        platform: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate crosspost configuration
   */
  public validateCrosspostConfiguration(scheduling: Scheduling, account: Account): string[] {
    const errors: string[] = []
    const platforms = scheduling.getCrosspostPlatforms()

    for (const platform of platforms) {
      switch (platform) {
        case 'twitter':
          if (!account.twitterAccessToken || !account.twitterAccessTokenSecret) {
            errors.push(`Twitter account not connected for ${account.handle}`)
          }
          if (account.twitterRateLimited) {
            errors.push(`Twitter account is rate limited for ${account.handle}`)
          }
          break
        
        case 'bluesky':
          if (!account.appPassword && !account.session) {
            errors.push(`Bluesky account not properly configured for ${account.handle}`)
          }
          if (account.isRateLimited) {
            errors.push(`Bluesky account is rate limited for ${account.handle}`)
          }
          break
      }
    }

    // Check character limits for different platforms
    if (platforms.includes('twitter') && scheduling.message.length > 280) {
      errors.push('Message exceeds Twitter character limit (280)')
    }

    // Check media limits
    const imageCount = scheduling.hasImages() ? JSON.parse(scheduling.images).length : 0
    const videoCount = scheduling.hasVideos() ? JSON.parse(scheduling.videos).length : 0

    if (platforms.includes('twitter')) {
      if (imageCount > 4) {
        errors.push('Twitter supports maximum 4 images per post')
      }
      if (videoCount > 1) {
        errors.push('Twitter supports maximum 1 video per post')
      }
    }

    return errors
  }
}
