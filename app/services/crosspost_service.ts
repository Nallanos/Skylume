import TwitterAccount from '#models/twitter_account'
import ThreadsAccount from '#models/threads_account'

export interface CrosspostData {
  message: string
  images?: string[]
  altTexts?: string[]
  videoData?: {
    filePath: string
    altText?: string
    thumbnail?: string
  }
}

export interface CrosspostResult {
  platform: string
  success: boolean
  postId?: string
  error?: string
}

export default class CrosspostService {
  /**
   * Post to Twitter/X
   */
  static async postToTwitter(accountId: number, data: CrosspostData): Promise<CrosspostResult> {
    try {
      const account = await TwitterAccount.findOrFail(accountId)
      
      // Make API call to Twitter
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: data.message,
          // Note: Media uploads would require separate endpoint calls
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          platform: 'twitter',
          success: false,
          error: `Twitter API error: ${error}`
        }
      }

      const result = await response.json()
      
      return {
        platform: 'twitter',
        success: true,
        postId: result.data?.id
      }
    } catch (error) {
      return {
        platform: 'twitter',
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Post to Threads
   */
  static async postToThreads(accountId: number, data: CrosspostData): Promise<CrosspostResult> {
    try {
      const account = await ThreadsAccount.findOrFail(accountId)
      
      // Create Threads post (simplified - actual implementation would handle media uploads)
      const response = await fetch(`https://graph.threads.net/v1.0/${account.threadsUserId}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          media_type: 'TEXT',
          text: data.message,
          access_token: account.accessToken,
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          platform: 'threads',
          success: false,
          error: `Threads API error: ${error}`
        }
      }

      const createResult = await response.json()
      
      // Publish the post
      const publishResponse = await fetch(`https://graph.threads.net/v1.0/${account.threadsUserId}/threads_publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          creation_id: createResult.id,
          access_token: account.accessToken,
        })
      })

      if (!publishResponse.ok) {
        const error = await publishResponse.text()
        return {
          platform: 'threads',
          success: false,
          error: `Threads publish error: ${error}`
        }
      }

      const publishResult = await publishResponse.json()
      
      return {
        platform: 'threads',
        success: true,
        postId: publishResult.id
      }
    } catch (error) {
      return {
        platform: 'threads',
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Execute crosspost to multiple platforms
   */
  static async crosspost(
    twitterAccountIds: number[],
    threadsAccountIds: number[],
    data: CrosspostData
  ): Promise<CrosspostResult[]> {
    const results: CrosspostResult[] = []

    // Post to Twitter accounts
    for (const accountId of twitterAccountIds) {
      const result = await this.postToTwitter(accountId, data)
      results.push(result)
    }

    // Post to Threads accounts
    for (const accountId of threadsAccountIds) {
      const result = await this.postToThreads(accountId, data)
      results.push(result)
    }

    return results
  }
}
