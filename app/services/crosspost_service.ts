import TwitterAccount from '#models/twitter_account'

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
   * Execute crosspost to multiple platforms
   */
  static async crosspost(
    twitterAccountIds: number[],
    data: CrosspostData
  ): Promise<CrosspostResult[]> {
    const results: CrosspostResult[] = []

    // Post to Twitter accounts
    for (const accountId of twitterAccountIds) {
      const result = await this.postToTwitter(accountId, data)
      results.push(result)
    }

    return results
  }
}
