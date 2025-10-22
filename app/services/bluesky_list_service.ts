import { BskyAgent } from '@atproto/api'
import BlueskyList from '#models/bluesky_list'
import BlueskyListMember from '#models/bluesky_list_member'
import Account from '#models/account'
import { DateTime } from 'luxon'

interface ProfileData {
  did?: string
  handle: string
  displayName?: string
  bio?: string
  avatar?: string
  followersCount?: number
  score?: number
}

export class BlueskyListService {
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

  /**
   * Create a new Bluesky list and save it to the database
   */
  async createList(
    userId: string,
    accountId: string,
    name: string,
    description: string | null,
    profiles: ProfileData[]
  ): Promise<BlueskyList> {
    // Get account and authenticate
    const account = await Account.findOrFail(accountId)
    const agent = await this.getAuthenticatedAgent(account)

    // Create list on Bluesky
    const listRecord = {
      purpose: 'app.bsky.graph.defs#curatelist',
      name: name,
      description: description || '',
      createdAt: new Date().toISOString(),
    }

    console.log('Creating Bluesky list:', listRecord)

    const listResponse = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.graph.list',
      record: listRecord,
    })

    console.log('Bluesky list created:', listResponse)

    // Save list to database
    const dbList = await BlueskyList.create({
      userId,
      accountId,
      name,
      description,
      listUri: listResponse.data.uri,
      listRkey: listResponse.data.uri.split('/').pop() || null,
      memberCount: 0,
    })

    // Add members to the list
    if (profiles.length > 0) {
      await this.addMembersToList(dbList, profiles, agent)
    }

    return dbList
  }

  /**
   * Add members to an existing list
   */
  async addMembersToList(
    list: BlueskyList,
    profiles: ProfileData[],
    agent?: BskyAgent
  ): Promise<void> {
    // If no agent provided, create one
    if (!agent) {
      const account = await Account.findOrFail(list.accountId)
      agent = await this.getAuthenticatedAgent(account)
    }

    let addedCount = 0

    for (const profile of profiles) {
      try {
        // Resolve DID if not provided
        let did = profile.did
        if (!did) {
          const resolveResponse = await agent.resolveHandle({ handle: profile.handle })
          did = resolveResponse.data.did
        }

        // Check if member already exists
        const existingMember = await BlueskyListMember.query()
          .where('list_id', list.id)
          .where('did', did)
          .first()

        if (existingMember) {
          console.log(`Member ${profile.handle} already in list, skipping`)
          continue
        }

        // Add to Bluesky list
        const listitemRecord = {
          subject: did,
          list: list.listUri!,
          createdAt: new Date().toISOString(),
        }

        const listitemResponse = await agent.api.com.atproto.repo.createRecord({
          repo: agent.session?.did || '',
          collection: 'app.bsky.graph.listitem',
          record: listitemRecord,
        })

        // Save member to database
        await BlueskyListMember.create({
          listId: list.id,
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
        console.log(`Added ${profile.handle} to list (${addedCount}/${profiles.length})`)

        // Rate limiting: wait 100ms between adds
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`Error adding ${profile.handle} to list:`, error.message)
      }
    }

    // Update member count
    list.memberCount = await BlueskyListMember.query().where('list_id', list.id).count('* as total').first().then(r => r?.$extras.total || 0)
    await list.save()

    console.log(`List updated: ${addedCount} members added, total: ${list.memberCount}`)
  }

  /**
   * Get all lists for a user
   */
  async getUserLists(userId: string, accountId?: string): Promise<BlueskyList[]> {
    const query = BlueskyList.query().where('user_id', userId)

    if (accountId) {
      query.where('account_id', accountId)
    }

    return query.orderBy('created_at', 'desc')
  }

  /**
   * Get list with members
   */
  async getListWithMembers(listId: number): Promise<BlueskyList> {
    const list = await BlueskyList.query()
      .where('id', listId)
      .preload('members')
      .firstOrFail()

    return list
  }

  /**
   * Follow all members in a list
   */
  async followAllMembers(listId: number, accountId: string): Promise<{ followed: number; errors: number }> {
    const list = await this.getListWithMembers(listId)
    const account = await Account.findOrFail(accountId)
    const agent = await this.getAuthenticatedAgent(account)

    let followed = 0
    let errors = 0

    for (const member of list.members) {
      if (member.isFollowed) {
        console.log(`Already following ${member.handle}, skipping`)
        continue
      }

      try {
        await agent.follow(member.did)
        
        member.isFollowed = true
        member.followedAt = DateTime.now()
        await member.save()

        followed++
        console.log(`Followed ${member.handle} (${followed}/${list.members.length})`)

        // Rate limiting: 1 follow per second
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.error(`Error following ${member.handle}:`, error.message)
        errors++
      }
    }

    return { followed, errors }
  }

  /**
   * Delete a list (from database and Bluesky)
   */
  async deleteList(listId: number): Promise<void> {
    const list = await BlueskyList.findOrFail(listId)
    const account = await Account.findOrFail(list.accountId)

    if (list.listUri) {
      try {
        const agent = await this.getAuthenticatedAgent(account)

        // Delete list from Bluesky
        await agent.api.com.atproto.repo.deleteRecord({
          repo: agent.session?.did || '',
          collection: 'app.bsky.graph.list',
          rkey: list.listRkey!,
        })

        console.log('Deleted list from Bluesky')
      } catch (error: any) {
        console.error('Error deleting list from Bluesky:', error.message)
      }
    }

    // Delete from database (cascade will delete members)
    await list.delete()
  }
}
