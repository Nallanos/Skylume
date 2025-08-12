import { inject } from '@adonisjs/core'
import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import Account from '#models/account'
import AccountManager from '#services/account_manager'
import { DateTime } from 'luxon'

// Types pour les conversations AT Protocol
interface ConversationMember {
  did: string
  handle?: string
  displayName?: string
}

@inject()
export default class ConversationTrackingService {
  constructor(
    protected accountManager: AccountManager
  ) {}

  /**
   * Vérifier les conversations existantes pour une campagne
   */
  public async checkExistingConversations(campaign: DmCampaign): Promise<void> {
    try {
      console.log(`🔍 Checking existing conversations for campaign: ${campaign.name}`)
      
      // Mettre à jour le statut
      campaign.checkConversationsStatus = 'in_progress'
      await campaign.save()

      // Obtenir le compte associé
      const account = await Account.findByOrFail('handle', campaign.accountHandle)
      const accountService = await this.accountManager.getOrCreateAccountService(account)
      await accountService.createOrResumeSession(account)

      // Récupérer toutes les conversations
      const conversations = await this.getAccountConversations(account)
      console.log(`📊 Found ${conversations.length} conversations to check`)

      // Récupérer tous les followers de la campagne
      const followers = await FollowerCampaign.query()
        .where('dmCampaignId', campaign.id)
        .where('conversationChecked', false)

      let checkedCount = 0
      let contactedCount = 0

      // Vérifier chaque follower
      for (const follower of followers) {
        const conversation = conversations.find(conv => 
          conv.members.some((member: any) => member.did === follower.followerDid)
        )

        if (conversation) {
          // Marquer comme déjà contacté
          await this.markAsContacted(
            follower.followerDid, 
            conversation.id,
            conversation.lastMessage?.sentAt
          )
          contactedCount++
          console.log(`✅ Found existing conversation with ${follower.followerHandle || follower.followerDid}`)
        }

        // Marquer comme vérifié
        follower.conversationChecked = true
        await follower.save()
        checkedCount++
      }

      // Mettre à jour le statut de la campagne
      campaign.checkConversationsStatus = 'completed'
      campaign.lastConversationCheck = DateTime.now()
      await campaign.save()

      console.log(`✅ Conversation check completed: ${checkedCount} checked, ${contactedCount} already contacted`)

    } catch (error) {
      console.error('❌ Error checking conversations:', error)
      campaign.checkConversationsStatus = 'failed'
      await campaign.save()
      throw error
    }
  }

  /**
   * Marquer un follower comme déjà contacté
   */
  public async markAsContacted(
    followerDid: string, 
    conversationId: string,
    lastMessageAt?: string
  ): Promise<void> {
    const follower = await FollowerCampaign.query()
      .where('followerDid', followerDid)
      .first()

    if (follower) {
      follower.alreadyContacted = true
      follower.conversationId = conversationId
      follower.conversationChecked = true
      
      if (lastMessageAt) {
        follower.lastMessageAt = DateTime.fromISO(lastMessageAt)
      }
      
      await follower.save()
    }
  }

  /**
   * Récupérer les conversations d'un compte
   */
  private async getAccountConversations(account: Account): Promise<any[]> {
    try {
      const accountService = await this.accountManager.getOrCreateAccountService(account)
      
      // Vérifier que la session est active
      if (!accountService.agent) {
        await accountService.createOrResumeSession(account)
      }

      const conversations: any[] = []
      let cursor: string | undefined

      // Paginer à travers toutes les conversations
      do {
        const response = await accountService.agent.api.chat.bsky.convo.listConvos({
          limit: 100,
          cursor
        })

        conversations.push(...response.data.convos)
        cursor = response.data.cursor
        
        // Limite de sécurité pour éviter les boucles infinies
        if (conversations.length > 10000) {
          console.warn('⚠️ Reached conversation limit of 10,000')
          break
        }
      } while (cursor)

      return conversations
    } catch (error) {
      console.error('❌ Error fetching conversations:', error)
      return []
    }
  }

  /**
   * Obtenir le statut des conversations pour une campagne
   */
  public async getConversationStatus(campaignId: number): Promise<{
    total: number
    checked: number
    contacted: number
    pending: number
  }> {
    const stats = await FollowerCampaign.query()
      .where('dmCampaignId', campaignId)
      .select('conversationChecked', 'alreadyContacted')
      .groupBy('conversationChecked', 'alreadyContacted')
      .count('* as count')

    const result = {
      total: 0,
      checked: 0,
      contacted: 0,
      pending: 0
    }

    for (const stat of stats) {
      const count = Number(stat.$extras.count)
      result.total += count

      if (stat.conversationChecked) {
        result.checked += count
        if (stat.alreadyContacted) {
          result.contacted += count
        }
      } else {
        result.pending += count
      }
    }

    return result
  }
}
