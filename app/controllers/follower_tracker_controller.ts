import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import RelationshipHistory from '#models/relationship_history'
import { inject } from '@adonisjs/core'
import AccountManager from '#services/account_manager'
import AccountService from '#services/account_service'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import redis from '@adonisjs/redis/services/main'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'

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
      return response.redirect('/dashboard')
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
   * Display the Follower Tracker page - only check cache, never fetch fresh data
   */
  public async index({ inertia, auth, params }: HttpContext) {
    const user = auth.user
    if (!user) {
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        isLoading: false,
        error: 'User not authenticated'
      })
    }

    try {
      // Get the account for this user
      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      // Check if we have cached data - if yes, return it, if no, return empty
      const cacheKey = `follower_relationships:${account.did || account.handle}`
      let followers: FollowerWithStatus[] = []
      let relationshipCounts: any = null
      let pagination: any = null

      try {
        const cachedData = await redis.get(cacheKey)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (parsed.allUsers && Array.isArray(parsed.allUsers) && 
              parsed.relationshipCounts && typeof parsed.relationshipCounts === 'object') {
            followers = parsed.allUsers.slice(0, 20) // Show first 20 from cache
            relationshipCounts = parsed.relationshipCounts
            pagination = {
              currentPage: 1,
              totalPages: Math.ceil(parsed.allUsers.length / 20),
              totalCount: parsed.allUsers.length,
              hasNextPage: parsed.allUsers.length > 20,
              hasPrevPage: false,
              loadedAll: true
            }
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError)
      }

      // Get relationship history for the last 30 days
      const relationshipHistory = await RelationshipHistory
        .query()
        .where('account_id', account.id)
        .where('recorded_at', '>=', DateTime.now().minus({ days: 30 }).startOf('day').toJSDate())
        .orderBy('recorded_at', 'asc')

      return inertia.render('FollowerTracker', {
        followers,
        account: {
          id: account.id,
          handle: account.handle,
          did: account.did,
          followersCount: account.followers_count || 0,
        },
        relationshipCounts,
        relationshipHistory: relationshipHistory.map(r => ({
          date: r.recordedAt.toFormat('yyyy-MM-dd'),
          mutual: r.mutualCount,
          i_follow_only: r.iFollowOnlyCount,
          they_follow_only: r.theyFollowOnlyCount
        })),
        pagination,
        isLoading: false // Never loading in index - data is either available from cache or empty
      })
    } catch (error) {
      console.error('Error in FollowerTracker:', error)
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        isLoading: false,
        error: 'Failed to load follower data'
      })
    }
  }

  /**
   * Load follower data asynchronously (API endpoint)
   * This endpoint only returns cached data - no automatic fresh fetching
   */
  public async loadData({ response, auth, params, request }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.status(401).json({ error: 'User not authenticated' })
    }

    try {
      // Get the account for this user
      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      const page = parseInt(request.input('page', '1'))
      const limit = parseInt(request.input('limit', '20'))
      const filter = request.input('filter', 'all')
      const search = request.input('search', '')

      // Only return cached data - never fetch fresh data automatically
      const cacheKey = `follower_relationships:${account.did || account.handle}`
      let allUsers: FollowerWithStatus[] = []
      let relationshipCounts: any = { all: 0, mutual: 0, they_follow_only: 0, i_follow_only: 0 }

      try {
        const cachedData = await redis.get(cacheKey)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (parsed.allUsers && Array.isArray(parsed.allUsers) && 
              parsed.relationshipCounts && typeof parsed.relationshipCounts === 'object') {
            allUsers = parsed.allUsers
            relationshipCounts = parsed.relationshipCounts
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError)
      }

      // If no cached data, return empty results
      if (allUsers.length === 0) {
        return response.json({
          followers: [],
          relationshipCounts: { all: 0, mutual: 0, they_follow_only: 0, i_follow_only: 0 },
          relationshipHistory: [],
          pagination: { currentPage: 1, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false },
          cached: false
        })
      }

      // Apply filters to cached data
      let filteredUsers = allUsers

      if (filter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === filter)
      }

      if (search) {
        const searchLower = search.toLowerCase()
        filteredUsers = filteredUsers.filter(user => 
          user.handle.toLowerCase().includes(searchLower) ||
          (user.displayName && user.displayName.toLowerCase().includes(searchLower))
        )
      }

      // Paginate
      const totalCount = filteredUsers.length
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit
      const paginatedUsers = filteredUsers.slice(offset, offset + limit)

      const pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        loadedAll: true
      }

      // Get relationship history
      const relationshipHistory = await RelationshipHistory
        .query()
        .where('account_id', account.id)
        .where('recorded_at', '>=', DateTime.now().minus({ days: 30 }).startOf('day').toJSDate())
        .orderBy('recorded_at', 'asc')

      return response.json({
        followers: paginatedUsers,
        relationshipCounts,
        relationshipHistory: relationshipHistory.map(r => ({
          date: r.recordedAt.toFormat('yyyy-MM-dd'),
          mutual: r.mutualCount,
          i_follow_only: r.iFollowOnlyCount,
          they_follow_only: r.theyFollowOnlyCount
        })),
        pagination,
        cached: true
      })
    } catch (error) {
      console.error('Error loading follower data:', error)
      return response.status(500).json({ error: 'Failed to load follower data' })
    }
  }

  /**
   * Load ALL follower data (separate endpoint for bulk operations)
   */
  public async loadAllData({ inertia, auth, params, request }: HttpContext) {
    const user = auth.user
    if (!user) {
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        isLoading: false,
        error: 'User not authenticated'
      })
    }

    try {
      // Get the account for this user
      const account = await Account.query()
        .where('id', params.id)
        .where('userId', user.id)
        .firstOrFail()

      const filter = request.input('filter', 'all')
      const search = request.input('search', '')

      // Load ALL data - this will be slow but necessary for bulk operations
      const followersData = await this.getFollowerRelationships(account, 1, 50, filter, search, true)

      return inertia.render('FollowerTracker', {
        followers: followersData.followers,
        account: {
          id: account.id,
          handle: account.handle,
          did: account.did,
          followersCount: account.followers_count || 0,
        },
        relationshipCounts: followersData.relationshipCounts,
        relationshipHistory: followersData.relationshipHistory,
        pagination: followersData.pagination,
        isLoading: false
      })
    } catch (error) {
      console.error('Error loading all follower data:', error)
      return inertia.render('FollowerTracker', {
        followers: [],
        account: null,
        isLoading: false,
        error: 'Failed to load all follower data'
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
  ): Promise<{ followers: FollowerWithStatus[], relationshipCounts: any, relationshipHistory: any[], pagination: any }> {
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
          // Validate cached data structure
          if (parsed.allUsers && Array.isArray(parsed.allUsers) && 
              parsed.relationshipCounts && typeof parsed.relationshipCounts === 'object') {
            allUsers = parsed.allUsers
            relationshipCounts = parsed.relationshipCounts
            console.log(`Using cached data for ${account.handle} (${allUsers.length} users, ${relationshipCounts.mutual || 0} mutual relationships)`)
          } else {
            console.warn(`Invalid cached data structure for ${account.handle}, fetching fresh data`)
            // Clear invalid cache
            await redis.del(cacheKey)
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError)
        // Clear potentially corrupted cache
        try {
          await redis.del(cacheKey)
        } catch (delError) {
          console.warn('Failed to clear corrupted cache:', delError)
        }
      }

      // If no cached data or invalid cache, fetch fresh data
      if (allUsers.length === 0 || !relationshipCounts || typeof relationshipCounts !== 'object') {
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

      // Final validation to ensure relationshipCounts is valid
      if (!relationshipCounts || typeof relationshipCounts !== 'object') {
        // Fallback: calculate counts from allUsers if available
        if (allUsers && allUsers.length > 0) {
          relationshipCounts = {
            all: allUsers.length,
            mutual: allUsers.filter(u => u.status === 'mutual').length,
            they_follow_only: allUsers.filter(u => u.status === 'they_follow_only').length,
            i_follow_only: allUsers.filter(u => u.status === 'i_follow_only').length
          }
          console.log(`Recalculated relationship counts for ${account.handle}:`, relationshipCounts)
        } else {
          // Ultimate fallback
          relationshipCounts = { all: 0, mutual: 0, they_follow_only: 0, i_follow_only: 0 }
          console.warn(`Using fallback relationship counts for ${account.handle}`)
        }
      }

      // Get relationship history for the last 30 days
      const relationshipHistory = await RelationshipHistory
        .query()
        .where('account_id', account.id)
        .where('recorded_at', '>=', DateTime.now().minus({ days: 30 }).startOf('day').toJSDate())
        .orderBy('recorded_at', 'asc')

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
        relationshipHistory: relationshipHistory.map(h => ({
          date: h.recordedAt.toFormat('yyyy-MM-dd'),
          mutual: h.mutualCount,
          i_follow_only: h.iFollowOnlyCount,
          they_follow_only: h.theyFollowOnlyCount
        })),
        pagination: pagination
      }
    } catch (error) {
      console.error('Error getting follower relationships:', error)
      return {
        followers: [],
        relationshipCounts: { all: 0, mutual: 0, they_follow_only: 0, i_follow_only: 0 },
        relationshipHistory: [],
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

    console.log(`Fetching followers and following for ${actor}...`)
    const [followersResult, followingResult] = await Promise.all([
      this.getAllFollowers(accountService, actor),
      this.getAllFollowing(accountService, actor)
    ])

    console.log(`Found ${followersResult.length} followers and ${followingResult.length} following for ${account.handle}`)

    // Create sets for fast lookup
    const followingSet = new Set(followingResult.map(f => f.did))
    const followersSet = new Set(followersResult.map(f => f.did))

    // Process all unique DIDs
    const allUserDids = new Set([...followersResult.map(f => f.did), ...followingResult.map(f => f.did)])
    const allUsers: FollowerWithStatus[] = []
    console.log(`Processing ${allUserDids.size} unique user DIDs for ${account.handle}`)

    // Count relationships as we process them
    let mutualCount = 0
    let theyFollowOnlyCount = 0
    let iFollowOnlyCount = 0

    for (const userDid of allUserDids) {
      const followerProfile = followersResult.find(f => f.did === userDid)
      const followingProfile = followingResult.find(f => f.did === userDid)

      const profile = followerProfile || followingProfile!

      let status: FollowerWithStatus['status']
      if (followersSet.has(userDid) && followingSet.has(userDid)) {
        status = 'mutual'
        mutualCount++
      } else if (followersSet.has(userDid)) {
        status = 'they_follow_only'
        theyFollowOnlyCount++
      } else if (followingSet.has(userDid)) {
        status = 'i_follow_only'
        iFollowOnlyCount++
      } else {
        // This shouldn't happen since we only process DIDs from followers/following lists
        continue
      }

      // Cross-validate with viewer data if available
      if (profile.viewer) {
        const viewerFollowing = profile.viewer.following
        const viewerFollowedBy = profile.viewer.followedBy
        
        // Log discrepancies for debugging
        if (status === 'they_follow_only' && viewerFollowing) {
          console.warn(`🔍 Discrepancy detected for ${profile.handle}: classified as 'they_follow_only' but viewer.following=true`)
          // Trust the viewer data more as it's fresher
          if (viewerFollowedBy) {
            status = 'mutual'
            mutualCount++
            theyFollowOnlyCount--
          } else {
            status = 'i_follow_only'
            iFollowOnlyCount++
            theyFollowOnlyCount--
          }
          console.log(`🔄 Corrected ${profile.handle} status to: ${status}`)
        }
        
        if (status === 'i_follow_only' && viewerFollowedBy) {
          console.warn(`🔍 Discrepancy detected for ${profile.handle}: classified as 'i_follow_only' but viewer.followedBy=true`)
          // Trust the viewer data more as it's fresher
          if (viewerFollowing) {
            status = 'mutual'
            mutualCount++
            iFollowOnlyCount--
          } else {
            status = 'they_follow_only'
            theyFollowOnlyCount++
            iFollowOnlyCount--
          }
          console.log(`🔄 Corrected ${profile.handle} status to: ${status}`)
        }
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

    // Calculate totals for each relationship type (using real-time counters for accuracy)
    const relationshipCounts = {
      all: allUsers.length,
      mutual: mutualCount,
      they_follow_only: theyFollowOnlyCount,
      i_follow_only: iFollowOnlyCount
    }

    // Validation: double-check our counts match the actual data
    const validationCounts = {
      mutual: allUsers.filter(u => u.status === 'mutual').length,
      they_follow_only: allUsers.filter(u => u.status === 'they_follow_only').length,
      i_follow_only: allUsers.filter(u => u.status === 'i_follow_only').length
    }

    // Log detailed breakdown
    console.log(`Relationship breakdown for ${account.handle}:`)
    console.log(`- Total users: ${relationshipCounts.all}`)
    console.log(`- Mutual follows: ${relationshipCounts.mutual} (validation: ${validationCounts.mutual})`)
    console.log(`- They follow only: ${relationshipCounts.they_follow_only} (validation: ${validationCounts.they_follow_only})`)
    console.log(`- I follow only: ${relationshipCounts.i_follow_only} (validation: ${validationCounts.i_follow_only})`)

    // Warn if validation fails
    if (relationshipCounts.mutual !== validationCounts.mutual ||
        relationshipCounts.they_follow_only !== validationCounts.they_follow_only ||
        relationshipCounts.i_follow_only !== validationCounts.i_follow_only) {
      console.warn(`Count validation failed for ${account.handle}! Using validation counts.`)
      relationshipCounts.mutual = validationCounts.mutual
      relationshipCounts.they_follow_only = validationCounts.they_follow_only
      relationshipCounts.i_follow_only = validationCounts.i_follow_only
    }

    // Save relationship history for today
    await this.saveRelationshipHistory(account, relationshipCounts)

    return { allUsers, relationshipCounts }
  }

  /**
   * Get all followers for an account (with pagination handling)
   */
  private async getAllFollowers(accountService: AccountService, actor: string): Promise<ProfileView[]> {
    const followers: ProfileView[] = []
    let cursor: string | undefined
    let pageCount = 0

    try {
      do {
        pageCount++
        const result = await accountService.agent.getFollowers({
          actor: actor,
          limit: 100,
          cursor: cursor
        })

        const newFollowers = result.data.followers || []
        followers.push(...newFollowers)
        cursor = result.data.cursor

        console.log(`Followers page ${pageCount}: got ${newFollowers.length} followers (total: ${followers.length})`)

        // Add delay to respect rate limits
        if (cursor) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } while (cursor && followers.length < 10000) // Increased limit to capture more relationships

      if (followers.length >= 10000) {
        console.warn(`⚠️  Follower limit reached (${followers.length}). Some followers may not be included in mutual follow calculations.`)
      }

      console.log(`✅ Finished fetching followers: ${followers.length} total in ${pageCount} pages`)
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
    let pageCount = 0

    try {
      do {
        pageCount++
        const result = await accountService.agent.getFollows({
          actor: actor,
          limit: 100,
          cursor: cursor
        })

        const newFollowing = result.data.follows || []
        following.push(...newFollowing)
        cursor = result.data.cursor

        console.log(`Following page ${pageCount}: got ${newFollowing.length} follows (total: ${following.length})`)

        // Add delay to respect rate limits
        if (cursor) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } while (cursor && following.length < 10000) // Increased limit to capture more relationships

      if (following.length >= 10000) {
        console.warn(`⚠️  Following limit reached (${following.length}). Some follows may not be included in mutual follow calculations.`)
      }

      console.log(`✅ Finished fetching following: ${following.length} total in ${pageCount} pages`)
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
   * Force a deep refresh of relationship data with individual relationship verification
   */
  public async deepRefreshCache({ params, auth, response }: HttpContext) {
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
      console.log(`🗑️  Cleared cache for deep refresh of ${account.handle}`)

      // Fetch fresh data with enhanced verification
      console.log(`🔄 Starting deep refresh for ${account.handle}...`)
      const freshData = await this.fetchFreshRelationshipDataWithVerification(account)

      // Cache the fresh data
      const cacheTTL = 60 * 30 // 30 minutes
      await redis.setex(cacheKey, cacheTTL, JSON.stringify({
        allUsers: freshData.allUsers,
        relationshipCounts: freshData.relationshipCounts,
        cachedAt: new Date().toISOString(),
        verificationMethod: 'deep_refresh'
      }))

      console.log(`✅ Deep refresh completed for ${account.handle}`)
      console.log(`📊 Final counts:`, freshData.relationshipCounts)

      return response.json({
        success: true,
        message: 'Deep cache refresh completed successfully',
        count: freshData.allUsers.length,
        relationshipCounts: freshData.relationshipCounts,
        corrections: freshData.corrections,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error in deep refresh cache:', error)
      return response.status(500).json({ 
        success: false, 
        message: 'Failed to deep refresh cache',
        error: error.message 
      })
    }
  }

  /**
   * Enhanced fetch with individual relationship verification
   */
  private async fetchFreshRelationshipDataWithVerification(account: Account): Promise<{ 
    allUsers: FollowerWithStatus[], 
    relationshipCounts: any,
    corrections: number
  }> {
    const accountService = await this.accountManager.getOrCreateAccountService(account)
    await accountService.createOrResumeSession(account)

    const actor = account.did || account.handle
    if (!actor) {
      throw new Error('Account has no DID or handle available')
    }

    console.log(`🔍 Fetching followers and following for verification: ${actor}`)
    const [followersResult, followingResult] = await Promise.all([
      this.getAllFollowers(accountService, actor),
      this.getAllFollowing(accountService, actor)
    ])

    console.log(`📊 Raw data: ${followersResult.length} followers, ${followingResult.length} following`)

    // Create sets for fast lookup
    const followingSet = new Set(followingResult.map(f => f.did))
    const followersSet = new Set(followersResult.map(f => f.did))

    // Process all unique DIDs with individual verification
    const allUserDids = new Set([...followersResult.map(f => f.did), ...followingResult.map(f => f.did)])
    const allUsers: FollowerWithStatus[] = []
    let corrections = 0

    console.log(`🔄 Processing ${allUserDids.size} unique DIDs with individual verification...`)

    for (const userDid of allUserDids) {
      const followerProfile = followersResult.find(f => f.did === userDid)
      const followingProfile = followingResult.find(f => f.did === userDid)
      const profile = followerProfile || followingProfile!

      // Initial classification based on sets
      let preliminaryStatus: FollowerWithStatus['status']
      if (followersSet.has(userDid) && followingSet.has(userDid)) {
        preliminaryStatus = 'mutual'
      } else if (followersSet.has(userDid)) {
        preliminaryStatus = 'they_follow_only'
      } else {
        preliminaryStatus = 'i_follow_only'
      }

      // Verify with viewer data if available
      let finalStatus = preliminaryStatus
      if (profile.viewer) {
        const viewerFollowing = profile.viewer.following
        const viewerFollowedBy = profile.viewer.followedBy

        // Determine correct status based on viewer data
        let viewerBasedStatus: FollowerWithStatus['status']
        if (viewerFollowing && viewerFollowedBy) {
          viewerBasedStatus = 'mutual'
        } else if (viewerFollowedBy) {
          viewerBasedStatus = 'they_follow_only'
        } else if (viewerFollowing) {
          viewerBasedStatus = 'i_follow_only'
        } else {
          viewerBasedStatus = preliminaryStatus // Keep original if viewer data is unclear
        }

        // If there's a discrepancy, trust viewer data
        if (preliminaryStatus !== viewerBasedStatus) {
          console.log(`🔧 Correcting ${profile.handle}: ${preliminaryStatus} → ${viewerBasedStatus}`)
          finalStatus = viewerBasedStatus
          corrections++
        }
      }

      const labels = profile.labels?.map(label => label.val || 'unlabeled') || []

      allUsers.push({
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        description: profile.description,
        labels: labels,
        status: finalStatus,
        followersCount: profile.followersCount as number | undefined,
        followingCount: profile.followsCount as number | undefined,
        viewer: profile.viewer
      })
    }

    // Calculate final counts
    const relationshipCounts = {
      all: allUsers.length,
      mutual: allUsers.filter(u => u.status === 'mutual').length,
      they_follow_only: allUsers.filter(u => u.status === 'they_follow_only').length,
      i_follow_only: allUsers.filter(u => u.status === 'i_follow_only').length
    }

    console.log(`✅ Verification complete. Made ${corrections} corrections.`)
    console.log(`📊 Final breakdown:`, relationshipCounts)

    // Save relationship history
    await this.saveRelationshipHistory(account, relationshipCounts)

    return { allUsers, relationshipCounts, corrections }
  }

  /**
   * Validate relationship classification and detect potential issues
   */
  private validateRelationshipClassification(allUsers: FollowerWithStatus[]): { 
    warnings: string[], 
    stats: any,
    potentialMisclassifications: any[]
  } {
    const warnings: string[] = []
    const potentialMisclassifications: any[] = []
    
    // Group users by status
    const byStatus = allUsers.reduce((acc, user) => {
      if (!acc[user.status]) acc[user.status] = []
      acc[user.status].push(user)
      return acc
    }, {} as Record<string, FollowerWithStatus[]>)

    const stats = {
      total: allUsers.length,
      mutual: byStatus.mutual?.length || 0,
      they_follow_only: byStatus.they_follow_only?.length || 0,
      i_follow_only: byStatus.i_follow_only?.length || 0
    }

    // Check for users with suspicious viewer data that might indicate misclassification
    allUsers.forEach(user => {
      if (user.viewer) {
        const viewerFollowing = user.viewer.following
        const viewerFollowedBy = user.viewer.followedBy
        
        // Cross-check viewer data with our classification
        if (user.status === 'they_follow_only' && viewerFollowing) {
          potentialMisclassifications.push({
            handle: user.handle,
            currentStatus: user.status,
            viewerData: { following: viewerFollowing, followedBy: viewerFollowedBy },
            issue: 'Classified as they_follow_only but viewer.following is true'
          })
        }
        
        if (user.status === 'i_follow_only' && viewerFollowedBy) {
          potentialMisclassifications.push({
            handle: user.handle,
            currentStatus: user.status,
            viewerData: { following: viewerFollowing, followedBy: viewerFollowedBy },
            issue: 'Classified as i_follow_only but viewer.followedBy is true'
          })
        }
      }
    })

    if (potentialMisclassifications.length > 0) {
      warnings.push(`Found ${potentialMisclassifications.length} potential misclassifications based on viewer data`)
    }

    // Check for obvious data inconsistencies
    if (stats.total === 0) {
      warnings.push('No relationship data found - this might indicate API issues')
    }

    if (stats.mutual === 0 && stats.total > 100) {
      warnings.push('No mutual follows detected despite having many relationships - this seems unusual')
    }

    return {
      warnings,
      stats,
      potentialMisclassifications: potentialMisclassifications.slice(0, 10) // Limit to first 10 for readability
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
      console.log(`🗑️  Cleared cache for ${account.handle}`)

      // Fetch fresh data with detailed logging
      console.log(`🔄 Starting fresh data fetch for ${account.handle}...`)
      const freshData = await this.fetchFreshRelationshipData(account)

      // Additional validation - check for obvious misclassifications
      const diagnostics = this.validateRelationshipClassification(freshData.allUsers)

      // Cache the fresh data
      const cacheTTL = 60 * 30 // 30 minutes
      await redis.setex(cacheKey, cacheTTL, JSON.stringify({
        allUsers: freshData.allUsers,
        relationshipCounts: freshData.relationshipCounts,
        cachedAt: new Date().toISOString(),
        diagnostics: diagnostics
      }))

      console.log(`✅ Cache refresh completed for ${account.handle}`)
      console.log(`📊 Final counts:`, freshData.relationshipCounts)
      
      if (diagnostics.warnings.length > 0) {
        console.warn(`⚠️  Relationship validation warnings:`, diagnostics.warnings)
      }

      return response.json({
        success: true,
        message: 'Cache refreshed successfully',
        count: freshData.allUsers.length,
        relationshipCounts: freshData.relationshipCounts,
        diagnostics: diagnostics,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error refreshing cache:', error)
      return response.status(500).json({ 
        success: false, 
        message: 'Failed to refresh cache',
        error: error.message 
      })
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

  /**
   * Save relationship history for an account
   */
  private async saveRelationshipHistory(account: Account, relationshipCounts: any) {
    try {
      const today = DateTime.now().startOf('day')
      
      // Check if we already have an entry for today
      const existingEntry = await RelationshipHistory
        .query()
        .where('account_id', account.id)
        .where('recorded_at', today.toJSDate())
        .first()

      if (existingEntry) {
        // Update existing entry
        existingEntry.mutualCount = relationshipCounts.mutual
        existingEntry.iFollowOnlyCount = relationshipCounts.i_follow_only
        existingEntry.theyFollowOnlyCount = relationshipCounts.they_follow_only
        existingEntry.totalCount = relationshipCounts.all
        await existingEntry.save()
      } else {
        // Create new entry
        await RelationshipHistory.create({
          accountId: account.id,
          mutualCount: relationshipCounts.mutual,
          iFollowOnlyCount: relationshipCounts.i_follow_only,
          theyFollowOnlyCount: relationshipCounts.they_follow_only,
          totalCount: relationshipCounts.all,
          recordedAt: today
        })
      }
    } catch (error) {
      console.error('Error saving relationship history:', error)
      // Ne pas faire échouer l'opération principale si la sauvegarde d'historique échoue
    }
  }
}
