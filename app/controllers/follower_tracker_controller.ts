import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import { inject } from '@adonisjs/core'
import AccountManager from '#services/account_manager'
import AccountService from '#services/account_service'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import redis from '@adonisjs/redis/services/main'
import { randomUUID } from 'crypto'

interface FollowerWithStatus {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  description?: string
  labels?: string[]
  status: 'i_follow_only' | 'they_follow_only' | 'mutual'
  followersCount?: number
  followingCount?: number
  viewer?: any
}

@inject()
export default class FollowerTrackerController {
  constructor(protected accountManager: AccountManager) { }

  /**
   * Handle general follower tracker route - redirect to specific account or show account selection
   */
  public async selectAccount({ auth, response, inertia }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.redirect('/login')
    }

    try {
      // Get all accounts for this user
      const accounts = await Account.query().where('userId', user.id)

      if (accounts.length === 0) {
        // No accounts found, redirect to dashboard to add an account
        return response.redirect('/dashboard')
      }

      if (accounts.length === 1) {
        // Only one account, redirect directly to its follower tracker
        return response.redirect(`/accounts/${accounts[0].id}/follower-tracker`)
      }

      // Multiple accounts, show account selection page
      return inertia.render('FollowerTrackerSelection', { accounts })
    } catch (error) {
      console.error('Error in selectAccount:', error)
      return response.redirect('/dashboard')
    }
  }

  /**
   * Display the Follower Tracker page with relationship data
   */
  public async index({ inertia, auth, params, request }: HttpContext) {
    const user = auth.user
    if (!user) {
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        error: 'User not authenticated'
      })
    }

    try {
      // Get the account for this user
      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      const page = parseInt(request.input('page', '1'))
      const limit = parseInt(request.input('limit', '20')) // Reduced default limit for faster initial load
      const loadAll = request.input('loadAll', 'false') === 'true' // New parameter to load all data
      const filter = request.input('filter', 'all') // all, follows_back, i_follow_only, they_follow_only, mutual
      const search = request.input('search', '')

      // Get follower relationship data
      const followersData = await this.getFollowerRelationships(account, page, limit, filter, search, loadAll)

      return inertia.render('FollowerTracker', {
        followers: followersData.followers,
        account: {
          id: account.id,
          handle: account.handle,
          did: account.did,
          followersCount: account.followers_count || 0,
        },
        relationshipCounts: followersData.relationshipCounts,
        pagination: followersData.pagination,
        filters: {
          current: filter,
          search: search
        }
      })
    } catch (error) {
      console.error('Error in FollowerTracker:', error)
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        error: 'Failed to load follower data'
      })
    }
  }

  /**
   * Get follower relationships for an account
   */
  private async getFollowerRelationships(
    account: Account,
    page: number = 1,
    limit: number = 50,
    filter: string = 'all',
    search: string = '',
    loadAll: boolean = false
  ): Promise<{ followers: FollowerWithStatus[], relationshipCounts: any, pagination: any }> {
    try {
      // Cache key for this account's relationship data
      const cacheKey = `follower_relationships:${account.did || account.handle}`
      const cacheTTL = 60 * 30 // 30 minutes cache

      // Try to get cached data first
      let allUsers: FollowerWithStatus[] = []
      let relationshipCounts: any = {}

      try {
        const cachedData = await redis.get(cacheKey)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          allUsers = parsed.allUsers
          relationshipCounts = parsed.relationshipCounts
          console.log(`Using cached data for ${account.handle} (${allUsers.length} relationships)`)
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError)
      }

      // If no cached data, fetch fresh data
      if (allUsers.length === 0) {
        console.log(`Fetching fresh data for ${account.handle}...`)
        const freshData = await this.fetchFreshRelationshipData(account)
        allUsers = freshData.allUsers
        relationshipCounts = freshData.relationshipCounts

        // Cache the fresh data
        try {
          await redis.setex(cacheKey, cacheTTL, JSON.stringify({
            allUsers,
            relationshipCounts,
            cachedAt: new Date().toISOString()
          }))
          console.log(`Cached relationship data for ${account.handle}`)
        } catch (cacheError) {
          console.warn('Cache storage failed:', cacheError)
        }
      }

      // Apply filters
      let filteredUsers = allUsers

      if (filter !== 'all') {
        filteredUsers = allUsers.filter(user => user.status === filter)
      }

      if (search) {
        const searchLower = search.toLowerCase()
        filteredUsers = filteredUsers.filter(user =>
          user.handle.toLowerCase().includes(searchLower) ||
          user.displayName?.toLowerCase().includes(searchLower) ||
          user.description?.toLowerCase().includes(searchLower)
        )
      }

      // Sort by status priority and then by handle
      const statusPriority = {
        'mutual': 1,
        'they_follow_only': 2,
        'i_follow_only': 3
      }

      filteredUsers.sort((a, b) => {
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status]
        if (priorityDiff !== 0) return priorityDiff
        return a.handle.localeCompare(b.handle)
      })

      // Paginate
      const totalCount = filteredUsers.length
      let paginatedUsers: FollowerWithStatus[]
      let pagination: any

      if (loadAll) {
        // Return all filtered users without pagination
        paginatedUsers = filteredUsers
        pagination = {
          currentPage: 1,
          totalPages: 1,
          totalCount: totalCount,
          hasNextPage: false,
          hasPrevPage: false,
          loadedAll: true
        }
      } else {
        // Standard pagination
        const totalPages = Math.ceil(totalCount / limit)
        const startIndex = (page - 1) * limit
        paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit)
        pagination = {
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          loadedAll: false
        }
      }

      return {
        followers: paginatedUsers,
        relationshipCounts: relationshipCounts,
        pagination: pagination
      }
    } catch (error) {
      console.error('Error getting follower relationships:', error)
      return {
        followers: [],
        relationshipCounts: { all: 0, mutual: 0, they_follow_only: 0, i_follow_only: 0 },
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false }
      }
    }
  }

  /**
   * Fetch fresh relationship data from Bluesky API
   */
  private async fetchFreshRelationshipData(account: Account): Promise<{ allUsers: FollowerWithStatus[], relationshipCounts: any }> {
    const accountService = await this.accountManager.getOrCreateAccountService(account)
    await accountService.createOrResumeSession(account)

    // Get followers and following lists
    // Use DID if available, otherwise use handle
    const actor = account.did || account.handle
    if (!actor) {
      throw new Error('Account has no DID or handle available')
    }

    const [followersResult, followingResult] = await Promise.all([
      this.getAllFollowers(accountService, actor),
      this.getAllFollowing(accountService, actor)
    ])

    // Create sets for fast lookup
    const followingSet = new Set(followingResult.map(f => f.did))
    const followersSet = new Set(followersResult.map(f => f.did))

    // Process all unique DIDs
    const allUserDids = new Set([...followersResult.map(f => f.did), ...followingResult.map(f => f.did)])
    const allUsers: FollowerWithStatus[] = []

    for (const userDid of allUserDids) {
      const followerProfile = followersResult.find(f => f.did === userDid)
      const followingProfile = followingResult.find(f => f.did === userDid)

      const profile = followerProfile || followingProfile!

      let status: FollowerWithStatus['status']
      if (followersSet.has(userDid) && followingSet.has(userDid)) {
        status = 'mutual'
      } else if (followersSet.has(userDid)) {
        status = 'they_follow_only'
      } else if (followingSet.has(userDid)) {
        status = 'i_follow_only'
      } else {
        // This shouldn't happen since we only process DIDs from followers/following lists
        continue
      }

      // Extract labels from profile
      const labels = profile.labels?.map(label => label.val || 'unlabeled') || []

      allUsers.push({
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        description: profile.description,
        labels: labels,
        status: status,
        followersCount: profile.followersCount as number | undefined,
        followingCount: profile.followsCount as number | undefined,
        viewer: profile.viewer
      })
    }

    // Calculate totals for each relationship type
    const relationshipCounts = {
      all: allUsers.length,
      mutual: allUsers.filter(u => u.status === 'mutual').length,
      they_follow_only: allUsers.filter(u => u.status === 'they_follow_only').length,
      i_follow_only: allUsers.filter(u => u.status === 'i_follow_only').length
    }

    return { allUsers, relationshipCounts }
  }

  /**
   * Get all followers for an account (with pagination handling)
   */
  private async getAllFollowers(accountService: AccountService, actor: string): Promise<ProfileView[]> {
    const followers: ProfileView[] = []
    let cursor: string | undefined

    try {
      do {
        const result = await accountService.agent.getFollowers({
          actor: actor,
          limit: 100,
          cursor: cursor
        })

        followers.push(...(result.data.followers || []))
        cursor = result.data.cursor

        // Add delay to respect rate limits
        if (cursor) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } while (cursor && followers.length < 5000) // Limit to prevent excessive API calls

      return followers
    } catch (error) {
      console.error('Error fetching followers:', error)
      return followers
    }
  }

  /**
   * Get all following for an account (with pagination handling)
   */
  private async getAllFollowing(accountService: AccountService, actor: string): Promise<ProfileView[]> {
    const following: ProfileView[] = []
    let cursor: string | undefined

    try {
      do {
        const result = await accountService.agent.getFollows({
          actor: actor,
          limit: 100,
          cursor: cursor
        })

        following.push(...(result.data.follows || []))
        cursor = result.data.cursor

        // Add delay to respect rate limits
        if (cursor) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } while (cursor && following.length < 5000) // Limit to prevent excessive API calls

      return following
    } catch (error) {
      console.error('Error fetching following:', error)
      return following
    }
  }

  /**
   * Batch follow multiple users (using job queue)
   */
  public async batchFollow({ request, response, auth, params }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { userDids } = request.only(['userDids'])

      if (!userDids || userDids.length === 0) {
        return response.status(400).json({ error: 'No user DIDs provided' })
      }

      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      // Generate unique job ID
      const jobId = randomUUID()

      // Start the background job
      const { default: BatchFollowJob } = await import('../jobs/batch_follow_job.js')
      const batchFollowJob = new BatchFollowJob(this.accountManager)

      // Execute job in background (don't await)
      batchFollowJob.handle({
        accountId: account.id,
        userDids: userDids,
        jobId: jobId
      }).catch((error: any) => {
        console.error('Batch follow job failed:', error)
      })

      return response.json({
        success: true,
        jobId: jobId,
        message: `Started batch follow job for ${userDids.length} users`,
        totalRequested: userDids.length
      })
    } catch (error) {
      console.error('Batch follow error:', error)
      return response.status(500).json({ error: 'Failed to start batch follow job' })
    }
  }

  /**
   * Batch unfollow multiple users (using job queue)
   */
  public async batchUnfollow({ request, response, auth, params }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { userDids } = request.only(['userDids'])

      if (!userDids || userDids.length === 0) {
        return response.status(400).json({ error: 'No user DIDs provided' })
      }

      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      // Generate unique job ID
      const jobId = randomUUID()

      // Start the background job
      const { default: BatchUnfollowJob } = await import('../jobs/batch_unfollow_job.js')
      const batchUnfollowJob = new BatchUnfollowJob(this.accountManager)

      // Execute job in background (don't await)
      batchUnfollowJob.handle({
        accountId: account.id,
        userDids: userDids,
        jobId: jobId
      }).catch((error: any) => {
        console.error('Batch unfollow job failed:', error)
      })

      return response.json({
        success: true,
        jobId: jobId,
        message: `Started batch unfollow job for ${userDids.length} users`,
        totalRequested: userDids.length
      })
    } catch (error) {
      console.error('Batch unfollow error:', error)
      return response.status(500).json({ error: 'Failed to start batch unfollow job' })
    }
  }

  /**
   * Get detailed profile information for a user
   */
  public async getUserProfile({ request, response, auth, params }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { did } = request.only(['did'])

      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      const accountService = await this.accountManager.getOrCreateAccountService(account)
      await accountService.createOrResumeSession(account)

      const profile = await accountService.agent.getProfile({ actor: did })

      return response.json({
        success: true,
        profile: profile.data
      })
    } catch (error) {
      console.error('Get user profile error:', error)
      return response.status(500).json({ error: 'Failed to get user profile' })
    }
  }

  /**
   * Refresh cached relationship data for an account
   */
  public async refreshCache({ params, auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ success: false, message: 'Not authenticated' })
    }

    try {
      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      const cacheKey = `follower_relationships:${account.did || account.handle}`

      // Delete existing cache
      await redis.del(cacheKey)

      // Fetch fresh data
      const freshData = await this.fetchFreshRelationshipData(account)

      // Cache the fresh data
      const cacheTTL = 60 * 30 // 30 minutes
      await redis.setex(cacheKey, cacheTTL, JSON.stringify({
        allUsers: freshData.allUsers,
        relationshipCounts: freshData.relationshipCounts,
        cachedAt: new Date().toISOString()
      }))

      return response.json({
        success: true,
        message: 'Cache refreshed successfully',
        count: freshData.allUsers.length
      })
    } catch (error) {
      console.error('Error refreshing cache:', error)
      return response.status(500).json({ success: false, message: 'Failed to refresh cache' })
    }
  }

  /**
   * Get progress of a batch job
   */
  public async getBatchProgress({ params, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { jobId, action } = params

      if (!jobId || !action) {
        return response.status(400).json({ error: 'Job ID and action are required' })
      }

      const progressKey = `batch_${action}_progress:${jobId}`
      const progressData = await redis.get(progressKey)

      if (!progressData) {
        return response.status(404).json({ error: 'Job not found or expired' })
      }

      const progress = JSON.parse(progressData)

      return response.json({
        success: true,
        jobId: jobId,
        ...progress
      })
    } catch (error) {
      console.error('Get batch progress error:', error)
      return response.status(500).json({ error: 'Failed to get job progress' })
    }
  }

  /**
   * Get all active jobs for an account
   */
  public async getActiveJobs({ params, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { id: accountId } = params

      // Verify account ownership
      const account = await Account.query()
        .where('id', accountId)
        .where('userId', user.id)
        .first()

      if (!account) {
        return response.status(404).json({ error: 'Account not found' })
      }

      // Check for active jobs in Redis
      const activeJobs = []

      try {
        // Check for follow jobs
        const followKeys = await redis.keys(`batch_follow_progress:*`)
        for (const key of followKeys) {
          const jobData = await redis.get(key)
          if (jobData) {
            try {
              const job = JSON.parse(jobData)
              if (job.accountId === accountId && job.status === 'running') {
                const jobId = key.split(':')[1]
                activeJobs.push({
                  jobId,
                  action: 'follow',
                  ...job
                })
              }
            } catch (parseError) {
              // Skip invalid job data
            }
          }
        }

        // Check for unfollow jobs
        const unfollowKeys = await redis.keys(`batch_unfollow_progress:*`)
        for (const key of unfollowKeys) {
          const jobData = await redis.get(key)
          if (jobData) {
            try {
              const job = JSON.parse(jobData)
              if (job.accountId === accountId && job.status === 'running') {
                const jobId = key.split(':')[1]
                activeJobs.push({
                  jobId,
                  action: 'unfollow',
                  ...job
                })
              }
            } catch (parseError) {
              // Skip invalid job data
            }
          }
        }
      } catch (redisError) {
        // Log Redis errors but continue
        console.error('Redis error while checking for active jobs:', redisError)
      }

      return response.json({
        success: true,
        activeJobs
      })
    } catch (error) {
      console.error('Get active jobs error:', error)
      return response.status(500).json({ error: 'Failed to get active jobs' })
    }
  }

  /**
   * Cancel/delete a batch job
   */
  public async cancelBatchJob({ params, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const { id: accountId, action, jobId } = params

      // Verify account ownership
      const account = await Account.query()
        .where('id', accountId)
        .where('userId', user.id)
        .first()

      if (!account) {
        return response.status(404).json({ error: 'Account not found' })
      }

      if (!jobId || !action || !['follow', 'unfollow'].includes(action)) {
        return response.status(400).json({ error: 'Invalid job ID or action' })
      }

      const progressKey = `batch_${action}_progress:${jobId}`

      // Check if job exists and belongs to this account
      const jobData = await redis.get(progressKey)
      if (!jobData) {
        return response.status(404).json({ error: 'Job not found or already completed' })
      }

      const job = JSON.parse(jobData)
      if (job.accountId !== accountId) {
        return response.status(403).json({ error: 'Job does not belong to this account' })
      }

      if (job.status !== 'running') {
        return response.status(400).json({ error: 'Job is not running and cannot be cancelled' })
      }

      // Mark job as cancelled
      await redis.setex(progressKey, 600, JSON.stringify({
        ...job,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.id
      }))

      return response.json({
        success: true,
        message: 'Job cancelled successfully'
      })
    } catch (error) {
      console.error('Cancel batch job error:', error)
      return response.status(500).json({ error: 'Failed to cancel job' })
    }
  }
}
