import { inject } from '@adonisjs/core'
import CampaignMessage from '#models/campaign_message'

@inject()
export default class CampaignMessageService {

  /**
   * Créer des messages par défaut pour une campagne
   */
  public async createDefaultMessages(campaignId: number): Promise<void> {
    try {
      console.log(`🔧 Creating default messages for campaign ${campaignId}`)

      // Messages par défaut pour chaque niveau d'intérêt
    const defaultMessages = [
      {
        interestLevel: 'interested' as const,
        message: 'Hi! I noticed we share similar interests based on your profile. Would love to connect and discuss further!',
      },
      {
        interestLevel: 'moderately_interested' as const,
        message: 'Hello! Your profile caught my attention. I think we might have some common ground. Looking forward to connecting!',
      }
    ]      // Créer les messages
      for (const messageData of defaultMessages) {
        await CampaignMessage.create({
          dmCampaignId: campaignId,
          interestLevel: messageData.interestLevel,
          message: messageData.message,
          isActive: true,
          enabled: true,
          executionOrder: 0
        })
      }

      console.log(`✅ Created ${defaultMessages.length} default messages for campaign ${campaignId}`)
    } catch (error) {
      console.error('❌ Error creating default messages:', error)
      throw error
    }
  }

  /**
   * Obtenir le message approprié pour un follower
   */
  public async getMessageForFollower(
    campaignId: number, 
    interestLevel: string
  ): Promise<CampaignMessage | null> {
    return await CampaignMessage.query()
      .where('dmCampaignId', campaignId)
      .where('interestLevel', interestLevel)
      .where('isActive', true)
      .first()
  }

  /**
   * Obtenir tous les messages d'une campagne
   */
  public async getCampaignMessages(campaignId: number): Promise<CampaignMessage[]> {
    return await CampaignMessage.query()
      .where('dmCampaignId', campaignId)
      .orderBy('interestLevel', 'asc')
  }

  /**
   * Mettre à jour un message de campagne
   */
  public async updateMessage(
    messageId: number,
    data: Partial<Pick<CampaignMessage, 'message' | 'isActive'>>
  ): Promise<CampaignMessage> {
    const message = await CampaignMessage.findOrFail(messageId)
    
    if (data.message !== undefined) message.message = data.message
    if (data.isActive !== undefined) message.isActive = data.isActive
    
    await message.save()
    return message
  }

  /**
   * Créer un nouveau message pour une campagne
   */
  public async createMessage(data: {
    dmCampaignId: number
    interestLevel: 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'
    message: string
  }): Promise<CampaignMessage> {
    return await CampaignMessage.create({
      dmCampaignId: data.dmCampaignId,
      interestLevel: data.interestLevel,
      message: data.message,
      isActive: true,
      enabled: true,
      executionOrder: 0
    })
  }

  /**
   * Supprimer un message de campagne
   */
  public async deleteMessage(messageId: number): Promise<void> {
    const message = await CampaignMessage.findOrFail(messageId)
    await message.delete()
  }

  /**
   * Personnaliser un message avec les mots-clés de la campagne
   */
  public async personalizeMessage(
    message: string, 
    campaignKeywords: string,
    followerHandle?: string
  ): Promise<string> {
    let personalizedMessage = message

    // Remplacer [topic] par le premier mot-clé
    const keywords = campaignKeywords.split(',').map(k => k.trim())
    if (keywords.length > 0) {
      personalizedMessage = personalizedMessage.replace(/\[topic\]/g, keywords[0])
    }

    // Remplacer [handle] par le handle du follower si disponible
    if (followerHandle) {
      personalizedMessage = personalizedMessage.replace(/\[handle\]/g, `@${followerHandle}`)
    }

    return personalizedMessage
  }

  /**
   * Valider qu'une campagne a des messages configurés
   */
  public async validateCampaignMessages(campaignId: number): Promise<{
    isValid: boolean
    missingLevels: string[]
  }> {
    const messages = await this.getCampaignMessages(campaignId)
    const activeMessages = messages.filter(m => m.isActive)
    
    const requiredLevels = ['interested', 'moderately_interested']
    const presentLevels = activeMessages.map(m => m.interestLevel)
    const missingLevels = requiredLevels.filter(level => 
      !presentLevels.includes(level as 'interested' | 'moderately_interested')
    )
    
    return {
      isValid: missingLevels.length === 0,
      missingLevels
    }
  }
}
