import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AIService } from '#services/AI_services'
import { BlueskyListService } from '#services/bluesky_list_service'
import Account from '#models/account'
import BlueskyList from '#models/bluesky_list'
import BlueskyListMember from '#models/bluesky_list_member'
import BlueskyListBlacklist from '#models/bluesky_list_blacklist'
import { BskyAgent } from '@atproto/api'

@inject()
export default class ListCreatorController {
  constructor(
    protected aiService: AIService,
    protected listService: BlueskyListService
  ) {}

  /**
   * Helper to get authenticated agent with automatic token refresh
   */
  private async getAuthenticatedAgent(account: Account): Promise<BskyAgent> {
    const agent = new BskyAgent({ service: 'https://bsky.social' })
    
    try {
      if (account.session) {
        await agent.resumeSession(JSON.parse(account.session))
      } else if (account.appPassword) {
        const loginResponse = await agent.login({
          identifier: account.handle,
          password: account.appPassword
        })
        account.session = JSON.stringify(loginResponse.data)
        await account.save()
      } else {
        throw new Error('No valid credentials. Please reconnect your account.')
      }
    } catch (error: any) {
      // Session expired - try to login with app password
      if (error.error === 'ExpiredToken' && account.appPassword) {
        console.log(`🔄 Token expired for ${account.handle}, refreshing session...`)
        const loginResponse = await agent.login({
          identifier: account.handle,
          password: account.appPassword
        })
        account.session = JSON.stringify(loginResponse.data)
        await account.save()
        console.log(`✅ Successfully refreshed session for ${account.handle}`)
      } else {
        throw new Error(`Failed to authenticate: ${error.message}`)
      }
    }
    
    return agent
  }

  public async index({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    const accounts = await Account.query().where('user_id', user.id).select('id', 'handle', 'session')
    return inertia.render('ListCreator', {
      user,
      accounts: accounts.map(acc => ({id: acc.id, handle: acc.handle, displayName: acc.handle}))
    })
  }

  public async blacklistPage({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    return inertia.render('Blacklist', { user })
  }

  public async search({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { keywords, account_id, limit = 50, cursor, existing_handles, relationship_filter } = request.only([
        'keywords', 'account_id', 'limit', 'cursor', 'existing_handles', 'relationship_filter'])
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return response.status(400).json({status: 'error', message: 'keywords required'})
      }
      if (!account_id) {
        return response.status(400).json({status: 'error', message: 'account_id required'})
      }
      const accountIdStr = String(account_id)
      console.log(`Searching for account with id: ${accountIdStr} for user: ${user.id}`)
      const account = await Account.query()
        .where('id', accountIdStr)
        .where('user_id', user.id)
        .first()
      if (!account) {
        console.log(`Account not found. Available accounts for user ${user.id}:`)
        const userAccounts = await Account.query().where('user_id', user.id).select('id', 'handle')
        console.log(userAccounts)
        return response.status(404).json({
          status: 'error', 
          message: 'Account not found or does not belong to you'
        })
      }
      
      // Get authenticated agent with automatic token refresh
      let agent: BskyAgent
      try {
        agent = await this.getAuthenticatedAgent(account)
      } catch (error: any) {
        return response.status(401).json({
          status: 'error',
          message: error.message || 'Failed to authenticate with Bluesky'
        })
      }

      // Support cursor and deduplication
      const searchKeywords = keywords.slice(0, 3)
      const allProfiles = new Map<string, any>()
      const cursors: Record<string, string | null> = (cursor && typeof cursor === 'object') ? cursor : {}
      const already = Array.isArray(existing_handles) ? new Set(existing_handles) : new Set()

      console.log(`Searching Bluesky with ${searchKeywords.length} keywords separately (with cursor)...`)
      for (const keyword of searchKeywords) {
        try {
          const kwCursor = cursors[keyword] || undefined
          console.log(`  Searching for: "${keyword}" (cursor: ${kwCursor || 'none'})`)
          const searchResults = await agent.searchActors({
            term: keyword,
            limit: Math.min(limit, 100),
            cursor: kwCursor
          })
          if (searchResults.data.actors && searchResults.data.actors.length > 0) {
            console.log(`    Found ${searchResults.data.actors.length} profiles for "${keyword}"`)
            searchResults.data.actors.forEach(actor => {
              if (!allProfiles.has(actor.handle) && !already.has(actor.handle)) {
                allProfiles.set(actor.handle, {
                  username: actor.handle,
                  did: actor.did,
                  bio: actor.description || '',
                  displayName: actor.displayName || actor.handle,
                  avatar: actor.avatar,
                  followersCount: (actor.followersCount as number) || 0
                })
              }
            })
            // Update cursor for this keyword
            cursors[keyword] = searchResults.data.cursor || null
          } else {
            console.log(`    No profiles found for "${keyword}"`)
            cursors[keyword] = null
          }
        } catch (error) {
          console.error(`    Error searching for "${keyword}":`, error.message)
        }
      }
      const profiles = Array.from(allProfiles.values())
      console.log(`Total unique profiles found: ${profiles.length}`)
      if (profiles.length === 0) {
        console.log('No profiles found by Bluesky search')
        return response.json({
          status: 'success', 
          data: [], 
          meta: {
            total_found: 0, 
            keywords,
            search_keywords: searchKeywords,
            cursors,
            message: 'No profiles found. Try different keywords or check spelling.'
          }
        })
      }

      // Get relationships in batches of 30 (API limit)
      const profilesWithDid: any[] = []
      for (let i = 0; i < profiles.length; i += 30) {
        const batch = profiles.slice(i, i + 30)
        try {
          // DIDs are already in the profile data from searchActors
          const dids = batch.map((p: any) => p.did)
          const validDids = dids.filter((d: any) => d !== null && d !== undefined)
          
          // Get relationships for this batch
          if (validDids.length > 0 && account.session) {
            const sessionData = JSON.parse(account.session)
            const relationships = await agent.app.bsky.graph.getRelationships({
              actor: sessionData.did,
              others: validDids as string[]
            })

            // Map relationships to profiles
            batch.forEach((profile: any) => {
              const did = profile.did
              if (did) {
                const rel = relationships.data.relationships.find((r: any) => r.did === did)
                profilesWithDid.push({
                  ...profile,
                  following: rel?.following || null,
                  followedBy: rel?.followedBy || null,
                })
              } else {
                profilesWithDid.push({
                  ...profile,
                  following: null,
                  followedBy: null,
                })
              }
            })
          } else {
            // No DIDs, add profiles without relationship data
            batch.forEach((profile: any) => {
              profilesWithDid.push({
                ...profile,
                following: null,
                followedBy: null,
              })
            })
          }
        } catch (error) {
          console.error('Error getting relationships for batch:', error)
          // Add profiles without relationship data
          batch.forEach((profile: any) => {
            profilesWithDid.push({
              ...profile,
              following: null,
              followedBy: null,
            })
          })
        }
      }

      // Apply relationship filter if specified
      let filteredProfiles = profilesWithDid
      if (relationship_filter) {
        const beforeCount = profilesWithDid.length
        console.log(`Applying relationship filter: ${relationship_filter} to ${beforeCount} profiles`)
        
        if (relationship_filter === 'not_following') {
          // Filter out profiles where following is truthy (has a URI string)
          filteredProfiles = profilesWithDid.filter((p: any) => {
            const isNotFollowing = !p.following || p.following === null
            if (!isNotFollowing) {
              console.log(`  ❌ Excluding ${p.username} (following: ${p.following})`)
            }
            return isNotFollowing
          })
        } else if (relationship_filter === 'following') {
          filteredProfiles = profilesWithDid.filter((p: any) => p.following && p.following !== null)
        } else if (relationship_filter === 'mutual') {
          filteredProfiles = profilesWithDid.filter((p: any) => 
            p.following && p.following !== null && p.followedBy && p.followedBy !== null
          )
        } else if (relationship_filter === 'followed_by') {
          filteredProfiles = profilesWithDid.filter((p: any) => p.followedBy && p.followedBy !== null)
        }
        
        console.log(`✅ Filtered to ${filteredProfiles.length} profiles after relationship filter (removed ${beforeCount - filteredProfiles.length})`)
      }

      // Filter out blacklisted profiles
      const blacklistedDids = await BlueskyListBlacklist.query()
        .where('user_id', user.id)
        .select('did')
      const blacklistedDidsSet = new Set(blacklistedDids.map(b => b.did))
      
      const beforeBlacklist = filteredProfiles.length
      filteredProfiles = filteredProfiles.filter((p: any) => !blacklistedDidsSet.has(p.did))
      
      if (beforeBlacklist > filteredProfiles.length) {
        console.log(`🚫 Removed ${beforeBlacklist - filteredProfiles.length} blacklisted profiles`)
      }

      const scoredProfiles = await this.aiService.scoreProfilesBySimpleCosine(filteredProfiles, keywords)
      scoredProfiles.sort((a: any, b: any) => b.score - a.score)
      console.log(`Analysis complete. Top score: ${scoredProfiles[0]?.score || 0}`)
      return response.json({
        status: 'success', 
        data: scoredProfiles, 
        meta: {
          total_found: scoredProfiles.length,
          keywords,
          search_keywords: searchKeywords,
          cursors
        }
      })
    } catch (error) {
      console.error('Error:', error)
      return response.status(500).json({status: 'error', message: 'Search error', error: error.message})
    }
  }

  /**
   * Save search results as a Bluesky list with real-time progress (SSE)
   */
  public async saveListStream({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { name, description, account_id, profiles } = request.only([
        'name',
        'description',
        'account_id',
        'profiles',
      ])

      if (!name || !account_id || !profiles || !Array.isArray(profiles)) {
        return response.status(400).json({
          status: 'error',
          message: 'Missing required fields: name, account_id, profiles',
        })
      }

      // Verify account belongs to user
      const account = await Account.query()
        .where('id', String(account_id))
        .where('user_id', user.id)
        .first()

      if (!account) {
        return response.status(404).json({
          status: 'error',
          message: 'Account not found',
        })
      }

      // Setup SSE
      response.response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      const sendProgress = (progress: number, message: string) => {
        response.response.write(`data: ${JSON.stringify({ progress, message })}\n\n`)
      }

      try {
        // Create list on Bluesky
        sendProgress(10, 'Creating list on Bluesky...')
        
        // Get authenticated agent with automatic token refresh
        const agent = await this.getAuthenticatedAgent(account)

        const listRecord = {
          purpose: 'app.bsky.graph.defs#curatelist',
          name: name,
          description: description || '',
          createdAt: new Date().toISOString(),
        }

        const listResponse = await agent.api.com.atproto.repo.createRecord({
          repo: agent.session?.did || '',
          collection: 'app.bsky.graph.list',
          record: listRecord,
        })

        sendProgress(20, 'List created, saving to database...')

        // Save list to database
        const dbList = await BlueskyList.create({
          userId: user.id,
          accountId: String(account_id),
          name,
          description,
          listUri: listResponse.data.uri,
          listRkey: listResponse.data.uri.split('/').pop() || null,
          memberCount: 0,
        })

        sendProgress(30, `Adding ${profiles.length} members...`)

        // Add members with progress updates
        let addedCount = 0
        const totalProfiles = profiles.length

        for (let i = 0; i < totalProfiles; i++) {
          const profile = profiles[i]
          try {
            // Resolve DID if not provided
            let did = profile.did
            if (!did) {
              const resolveResponse = await agent.resolveHandle({ handle: profile.handle })
              did = resolveResponse.data.did
            }

            // Check if member already exists
            const existingMember = await BlueskyListMember.query()
              .where('list_id', dbList.id)
              .where('did', did)
              .first()

            if (!existingMember) {
              // Add to Bluesky list
              const listitemRecord = {
                subject: did,
                list: dbList.listUri!,
                createdAt: new Date().toISOString(),
              }

              const listitemResponse = await agent.api.com.atproto.repo.createRecord({
                repo: agent.session?.did || '',
                collection: 'app.bsky.graph.listitem',
                record: listitemRecord,
              })

              // Save member to database
              await BlueskyListMember.create({
                listId: dbList.id,
                did,
                handle: profile.handle,
                displayName: profile.displayName || null,
                bio: profile.bio || null,
                avatar: profile.avatar || null,
                followersCount: profile.followersCount || 0,
                score: profile.score || null,
                isFollowed: false,
                listitemUri: listitemResponse.data.uri,
                listitemRkey: listitemResponse.data.uri.split('/').pop() || null,
              })

              addedCount++
            }

            // Calculate progress (30% to 90%)
            const memberProgress = 30 + Math.floor((i / totalProfiles) * 60)
            sendProgress(memberProgress, `Added ${i + 1}/${totalProfiles} members...`)

            // Rate limiting: wait 100ms between adds
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error: any) {
            console.error(`Error adding ${profile.handle}:`, error.message)
          }
        }

        // Update member count
        dbList.memberCount = await BlueskyListMember.query()
          .where('list_id', dbList.id)
          .count('* as total')
          .first()
          .then((r: any) => r?.$extras.total || 0)
        await dbList.save()

        sendProgress(100, 'List created successfully!')

        // Send final success message
        response.response.write(
          `data: ${JSON.stringify({
            progress: 100,
            message: 'Complete',
            data: {
              id: dbList.id,
              name: dbList.name,
              memberCount: dbList.memberCount,
              listUri: dbList.listUri,
            },
          })}\n\n`
        )

        response.response.end()
      } catch (error: any) {
        console.error('Error creating list:', error)
        response.response.write(
          `data: ${JSON.stringify({ progress: -1, message: 'Error', error: error.message })}\n\n`
        )
        response.response.end()
      }
    } catch (error: any) {
      console.error('Error:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to create list',
        error: error.message,
      })
    }
  }

  /**
   * Get all user's lists
   */
  public async getLists({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { account_id } = request.qs()

      const lists = await this.listService.getUserLists(user.id, account_id)

      return response.json({
        status: 'success',
        data: lists.map((list) => ({
          id: list.id,
          name: list.name,
          description: list.description,
          memberCount: list.memberCount,
          createdAt: list.createdAt.toISO(),
        })),
      })
    } catch (error: any) {
      console.error('Error fetching lists:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to fetch lists',
        error: error.message,
      })
    }
  }

  /**
   * Get list details with members
   */
  public async getListDetails({ params, response, auth, inertia }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const listId = params.id

      const list = await this.listService.getListWithMembers(listId)

      // Verify user owns this list
      if (list.userId !== user.id) {
        return response.status(403).json({
          status: 'error',
          message: 'Access denied',
        })
      }

      return inertia.render('ListDetail', {
        user,
        list: {
          id: list.id,
          name: list.name,
          description: list.description,
          memberCount: list.memberCount,
          listUri: list.listUri,
          createdAt: list.createdAt.toISO(),
          members: list.members.map((member) => ({
            id: member.id,
            did: member.did,
            handle: member.handle,
            displayName: member.displayName,
            bio: member.bio,
            avatar: member.avatar,
            followersCount: member.followersCount,
            score: member.score,
            isFollowed: member.isFollowed,
          })),
        },
      })
    } catch (error: any) {
      console.error('Error fetching list details:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to fetch list details',
        error: error.message,
      })
    }
  }

  /**
   * Follow all members in a list
   */
  public async followAll({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const listId = params.id
      let { account_id } = request.only(['account_id'])

      // If no account_id provided, use the user's first account
      if (!account_id) {
        const firstAccount = await Account.query()
          .where('user_id', user.id)
          .select('id')
          .first()
        
        if (!firstAccount) {
          return response.status(400).json({
            status: 'error',
            message: 'No Bluesky account found. Please connect an account first.',
          })
        }
        
        account_id = firstAccount.id
      }

      // Verify list belongs to user
      const list = await BlueskyList.findOrFail(listId)
      if (list.userId !== user.id) {
        return response.status(403).json({
          status: 'error',
          message: 'Access denied',
        })
      }

      const result = await this.listService.followAllMembers(listId, String(account_id))

      return response.json({
        status: 'success',
        message: `Followed ${result.followed} profiles`,
        data: result,
      })
    } catch (error: any) {
      console.error('Error following all:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to follow all members',
        error: error.message,
      })
    }
  }

  /**
   * Delete a list
   */
  public async deleteList({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const listId = params.id

      const list = await BlueskyList.findOrFail(listId)

      if (list.userId !== user.id) {
        return response.status(403).json({
          status: 'error',
          message: 'Access denied',
        })
      }

      await this.listService.deleteList(listId)

      return response.json({
        status: 'success',
        message: 'List deleted successfully',
      })
    } catch (error: any) {
      console.error('Error deleting list:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to delete list',
        error: error.message,
      })
    }
  }

  /**
   * Get user's blacklist
   */
  public async getBlacklist({ response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const blacklist = await BlueskyListBlacklist.query()
        .where('user_id', user.id)
        .orderBy('created_at', 'desc')

      return response.json({
        status: 'success',
        data: blacklist,
      })
    } catch (error: any) {
      console.error('Error fetching blacklist:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to fetch blacklist',
        error: error.message,
      })
    }
  }

  /**
   * Add a profile to blacklist
   */
  public async addToBlacklist({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { did, handle, display_name, bio, avatar, reason } = request.only([
        'did',
        'handle',
        'display_name',
        'bio',
        'avatar',
        'reason',
      ])

      if (!did || !handle) {
        return response.status(400).json({
          status: 'error',
          message: 'DID and handle are required',
        })
      }

      // Check if already blacklisted
      const existing = await BlueskyListBlacklist.query()
        .where('user_id', user.id)
        .where('did', did)
        .first()

      if (existing) {
        return response.status(400).json({
          status: 'error',
          message: 'Profile is already blacklisted',
        })
      }

      const blacklistEntry = await BlueskyListBlacklist.create({
        userId: user.id,
        did,
        handle,
        displayName: display_name || null,
        bio: bio || null,
        avatar: avatar || null,
        reason: reason || null,
      })

      console.log(`🚫 User ${user.id} blacklisted ${handle} (${did})`)

      return response.json({
        status: 'success',
        message: 'Profile added to blacklist',
        data: blacklistEntry,
      })
    } catch (error: any) {
      console.error('Error adding to blacklist:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to add to blacklist',
        error: error.message,
      })
    }
  }

  /**
   * Remove a profile from blacklist
   */
  public async removeFromBlacklist({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { did } = params

      const blacklistEntry = await BlueskyListBlacklist.query()
        .where('user_id', user.id)
        .where('did', did)
        .first()

      if (!blacklistEntry) {
        return response.status(404).json({
          status: 'error',
          message: 'Profile not found in blacklist',
        })
      }

      await blacklistEntry.delete()

      console.log(`✅ User ${user.id} removed ${blacklistEntry.handle} from blacklist`)

      return response.json({
        status: 'success',
        message: 'Profile removed from blacklist',
      })
    } catch (error: any) {
      console.error('Error removing from blacklist:', error)
      return response.status(500).json({
        status: 'error',
        message: 'Failed to remove from blacklist',
        error: error.message,
      })
    }
  }
}
