import { Redis } from 'ioredis'
import env from '#start/env'

export default class CacheService {
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      host: env.get('REDIS_HOST', 'localhost'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD'),
      db: parseInt(env.get('REDIS_DB', '0'), 10),
      maxRetriesPerRequest: 3,
    })
  }

  /**
   * Cache variable resolution results to avoid repeated calculations
   * Key format: variable_resolution:{campaignId}:{variableId}:{followerId}
   */
  async cacheVariableResolution(
    campaignId: number,
    variableId: number,
    followerId: number,
    resolution: string,
    ttl = 3600 // 1 hour default
  ): Promise<void> {
    const key = `variable_resolution:${campaignId}:${variableId}:${followerId}`
    await this.redis.setex(key, ttl, resolution)
  }

  /**
   * Get cached variable resolution
   */
  async getCachedVariableResolution(
    campaignId: number,
    variableId: number,
    followerId: number
  ): Promise<string | null> {
    const key = `variable_resolution:${campaignId}:${variableId}:${followerId}`
    return await this.redis.get(key)
  }

  /**
   * Cache group estimation results
   * Key format: group_estimation:{campaignId}:{conditionsHash}
   */
  async cacheGroupEstimation(
    campaignId: number,
    conditionsHash: string,
    estimation: number,
    ttl = 1800 // 30 minutes default
  ): Promise<void> {
    const key = `group_estimation:${campaignId}:${conditionsHash}`
    await this.redis.setex(key, ttl, estimation.toString())
  }

  /**
   * Get cached group estimation
   */
  async getCachedGroupEstimation(
    campaignId: number,
    conditionsHash: string
  ): Promise<number | null> {
    const key = `group_estimation:${campaignId}:${conditionsHash}`
    const cached = await this.redis.get(key)
    return cached ? parseInt(cached, 10) : null
  }

  /**
   * Cache personalized message for a specific follower and group
   * Key format: personalized_message:{campaignId}:{groupId}:{followerId}
   */
  async cachePersonalizedMessage(
    campaignId: number,
    groupId: number,
    followerId: number,
    message: string,
    ttl = 7200 // 2 hours default
  ): Promise<void> {
    const key = `personalized_message:${campaignId}:${groupId}:${followerId}`
    await this.redis.setex(key, ttl, message)
  }

  /**
   * Get cached personalized message
   */
  async getCachedPersonalizedMessage(
    campaignId: number,
    groupId: number,
    followerId: number
  ): Promise<string | null> {
    const key = `personalized_message:${campaignId}:${groupId}:${followerId}`
    return await this.redis.get(key)
  }

  /**
   * Cache campaign variables to avoid repeated database queries
   * Key format: campaign_variables:{campaignId}
   */
  async cacheCampaignVariables(
    campaignId: number,
    variables: any[],
    ttl = 3600 // 1 hour default
  ): Promise<void> {
    const key = `campaign_variables:${campaignId}`
    await this.redis.setex(key, ttl, JSON.stringify(variables))
  }

  /**
   * Get cached campaign variables
   */
  async getCachedCampaignVariables(campaignId: number): Promise<any[] | null> {
    const key = `campaign_variables:${campaignId}`
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Cache campaign groups to avoid repeated database queries
   * Key format: campaign_groups:{campaignId}
   */
  async cacheCampaignGroups(
    campaignId: number,
    groups: any[],
    ttl = 3600 // 1 hour default
  ): Promise<void> {
    const key = `campaign_groups:${campaignId}`
    await this.redis.setex(key, ttl, JSON.stringify(groups))
  }

  /**
   * Get cached campaign groups
   */
  async getCachedCampaignGroups(campaignId: number): Promise<any[] | null> {
    const key = `campaign_groups:${campaignId}`
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Invalidate all cache entries for a specific campaign
   */
  async invalidateCampaignCache(campaignId: number): Promise<void> {
    const patterns = [
      `variable_resolution:${campaignId}:*`,
      `group_estimation:${campaignId}:*`,
      `personalized_message:${campaignId}:*`,
      `campaign_variables:${campaignId}`,
      `campaign_groups:${campaignId}`,
    ]

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    }
  }

  /**
   * Invalidate cache entries for a specific group
   */
  async invalidateGroupCache(campaignId: number, groupId: number): Promise<void> {
    const patterns = [
      `group_estimation:${campaignId}:*`,
      `personalized_message:${campaignId}:${groupId}:*`,
      `campaign_groups:${campaignId}`,
    ]

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    }
  }

  /**
   * Invalidate cache entries for a specific variable
   */
  async invalidateVariableCache(campaignId: number, variableId: number): Promise<void> {
    const patterns = [
      `variable_resolution:${campaignId}:${variableId}:*`,
      `personalized_message:${campaignId}:*`, // Messages might depend on this variable
      `campaign_variables:${campaignId}`,
    ]

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate?: number
  }> {
    const info = await this.redis.info('memory')
    const dbSize = await this.redis.dbsize()
    
    const memoryMatch = info.match(/used_memory_human:(.+)/)
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown'

    return {
      totalKeys: dbSize,
      memoryUsage,
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      return false
    }
  }

  /**
   * Generate a hash for conditions to use as cache key
   */
  generateConditionsHash(conditions: Record<string, any>): string {
    const sorted = Object.keys(conditions)
      .sort()
      .reduce((result, key) => {
        result[key] = conditions[key]
        return result
      }, {} as Record<string, any>)
    
    return Buffer.from(JSON.stringify(sorted)).toString('base64')
  }

  /**
   * Batch cache multiple variable resolutions
   */
  async batchCacheVariableResolutions(
    resolutions: Array<{
      campaignId: number
      variableId: number
      followerId: number
      resolution: string
    }>,
    ttl = 3600
  ): Promise<void> {
    const pipeline = this.redis.pipeline()
    
    for (const item of resolutions) {
      const key = `variable_resolution:${item.campaignId}:${item.variableId}:${item.followerId}`
      pipeline.setex(key, ttl, item.resolution)
    }
    
    await pipeline.exec()
  }

  /**
   * Batch get multiple cached variable resolutions
   */
  async batchGetCachedVariableResolutions(
    requests: Array<{
      campaignId: number
      variableId: number
      followerId: number
    }>
  ): Promise<Array<string | null>> {
    const pipeline = this.redis.pipeline()
    
    for (const request of requests) {
      const key = `variable_resolution:${request.campaignId}:${request.variableId}:${request.followerId}`
      pipeline.get(key)
    }
    
    const results = await pipeline.exec()
    return results ? results.map((result: any) => result[1] as string | null) : []
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}
