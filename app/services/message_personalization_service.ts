import VariableService, { VariableResolution } from './variable_service.js'
import CampaignGroupMessage from '#models/campaign_group_message'
import FollowerCampaign from '#models/follower_campaign'
import CampaignGroup from '#models/campaign_group'
import GroupMessageTemplate from '#models/group_message_template'
import { DateTime } from 'luxon'

export interface MessagePreview {
  originalMessage: string
  resolvedMessage: string
  variablesUsed: VariableResolution
  missingVariables: string[]
}

export default class MessagePersonalizationService {
  private variableService: VariableService

  constructor() {
    this.variableService = new VariableService()
  }

  /**
   * Personnaliser un message pour un follower spécifique
   */
  async personalizeMessage(
    campaignId: number,
    groupId: number,
    followerCampaign: FollowerCampaign,
    messageTemplate: string
  ): Promise<CampaignGroupMessage> {
    // Résoudre toutes les variables pour ce follower
    const variablesResolution = await this.variableService.resolveVariables(
      campaignId,
      followerCampaign
    )

    // Remplacer les variables dans le message
    const personalizedMessage = this.variableService.replaceVariablesInMessage(
      messageTemplate,
      variablesResolution
    )

    // Créer l'enregistrement du message personnalisé
    const groupMessage = await CampaignGroupMessage.create({
      campaignId,
      groupId,
      followerCampaignId: followerCampaign.id,
      messageContent: personalizedMessage,
      variablesUsed: variablesResolution,
      deliverySuccess: false,
    })

    return groupMessage
  }

  /**
   * Générer un aperçu d'un message avec variables résolues
   */
  async previewMessage(
    campaignId: number,
    messageTemplate: string,
    sampleFollowerCampaign?: FollowerCampaign
  ): Promise<MessagePreview> {
    let variablesUsed: VariableResolution = {}
    let resolvedMessage = messageTemplate

    if (sampleFollowerCampaign) {
      // Utiliser un vrai follower pour l'aperçu
      variablesUsed = await this.variableService.resolveVariables(
        campaignId,
        sampleFollowerCampaign
      )
      resolvedMessage = this.variableService.replaceVariablesInMessage(
        messageTemplate,
        variablesUsed
      )
    } else {
      // Créer des valeurs d'exemple pour l'aperçu
      variablesUsed = await this.generateSampleVariables(campaignId)
      resolvedMessage = this.variableService.replaceVariablesInMessage(
        messageTemplate,
        variablesUsed
      )
    }

    // Vérifier les variables manquantes
    const validation = await this.variableService.validateMessageVariables(
      campaignId,
      messageTemplate
    )

    return {
      originalMessage: messageTemplate,
      resolvedMessage,
      variablesUsed,
      missingVariables: validation.missingVariables,
    }
  }

  /**
   * Traiter tous les messages d'un groupe
   */
  async processGroupMessages(
    campaignId: number,
    groupId: number
  ): Promise<CampaignGroupMessage[]> {
    const group = await CampaignGroup.findOrFail(groupId)
    
    // Récupérer tous les followers assignés à ce groupe
    const followers = await FollowerCampaign.query()
      .where('campaign_group_id', groupId)
      .where('message_sent', false) // Seulement ceux qui n'ont pas encore reçu de message

    const processedMessages: CampaignGroupMessage[] = []

    for (const follower of followers) {
      try {
        const message = await this.personalizeMessage(
          campaignId,
          groupId,
          follower,
          group.message
        )
        processedMessages.push(message)
      } catch (error) {
        console.error(`Error processing message for follower ${follower.id}:`, error)
        // Continuer avec les autres même en cas d'erreur
      }
    }

    return processedMessages
  }

  /**
   * Valider que tous les groupes ont des messages valides
   */
  async validateAllGroupMessages(campaignId: number): Promise<{
    isValid: boolean
    issues: Array<{
      groupId: number
      groupName: string
      issue: string
      missingVariables?: string[]
    }>
  }> {
    const groups = await CampaignGroup.query()
      .where('campaign_id', campaignId)
      .orderBy('order', 'asc')

    const issues = []

    for (const group of groups) {
      // Vérifier que le groupe a un message
      if (!group.message || group.message.trim().length === 0) {
        issues.push({
          groupId: group.id,
          groupName: group.name,
          issue: 'No message defined for this group',
        })
        continue
      }

      // Vérifier les variables utilisées
      const validation = await this.variableService.validateMessageVariables(
        campaignId,
        group.message
      )

      if (!validation.isValid) {
        issues.push({
          groupId: group.id,
          groupName: group.name,
          issue: 'Message uses undefined variables',
          missingVariables: validation.missingVariables,
        })
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * Générer des variables d'exemple pour l'aperçu
   */
  private async generateSampleVariables(campaignId: number): Promise<VariableResolution> {
    const variables = await this.variableService.getCampaignVariables(campaignId)
    const sampleResolution: VariableResolution = {}

    for (const variable of variables) {
      switch (variable.type) {
        case 'follower_count':
          const config = variable.configuration as any
          if (config?.shouldRound) {
            sampleResolution[variable.name] = '5k'
          } else {
            sampleResolution[variable.name] = 5000
          }
          break
        default:
          sampleResolution[variable.name] = '[sample_value]'
      }
    }

    return sampleResolution
  }

  /**
   * Obtenir les statistiques de personnalisation pour une campagne
   */
  async getPersonalizationStats(campaignId: number): Promise<{
    totalMessages: number
    successfulMessages: number
    failedMessages: number
    variableUsageStats: Record<string, number>
  }> {
    const messages = await CampaignGroupMessage.query()
      .where('campaign_id', campaignId)

    const totalMessages = messages.length
    const successfulMessages = messages.filter(m => m.deliverySuccess).length
    const failedMessages = totalMessages - successfulMessages

    // Compter l'utilisation des variables
    const variableUsageStats: Record<string, number> = {}
    
    for (const message of messages) {
      if (message.variablesUsed) {
        for (const variableName of Object.keys(message.variablesUsed)) {
          variableUsageStats[variableName] = (variableUsageStats[variableName] || 0) + 1
        }
      }
    }

    return {
      totalMessages,
      successfulMessages,
      failedMessages,
      variableUsageStats,
    }
  }

  /**
   * Nettoyer les messages d'une campagne (pour réinitialisation)
   */
  async cleanupCampaignMessages(campaignId: number): Promise<void> {
    await CampaignGroupMessage.query()
      .where('campaign_id', campaignId)
      .delete()
  }

  /**
   * Marquer un message comme envoyé avec succès
   */
  async markMessageSent(messageId: number, success: boolean, error?: string): Promise<void> {
    const message = await CampaignGroupMessage.findOrFail(messageId)
    
    message.merge({
      sentAt: DateTime.now(),
      deliverySuccess: success,
      deliveryError: error || null,
    })
    
    await message.save()

    // Mettre à jour les statistiques du groupe
    if (success) {
      const group = await CampaignGroup.findOrFail(message.groupId)
      group.messagesSent = group.messagesSent + 1
      await group.save()
    }
  }

  /**
   * Obtenir un échantillon de messages personnalisés pour aperçu
   */
  async getSamplePersonalizedMessages(
    campaignId: number,
    groupId: number,
    limit: number = 5
  ): Promise<MessagePreview[]> {
    const group = await CampaignGroup.findOrFail(groupId)
    
    const sampleFollowers = await FollowerCampaign.query()
      .where('campaign_group_id', groupId)
      .limit(limit)

    const previews: MessagePreview[] = []

    for (const follower of sampleFollowers) {
      const preview = await this.previewMessage(
        campaignId,
        group.message,
        follower
      )
      previews.push(preview)
    }

    return previews
  }

  /**
   * Créer un nouveau template de message pour un groupe
   */
  async createGroupMessage(
    groupId: number,
    content: string,
    weight: number = 1
  ): Promise<GroupMessageTemplate> {
    const template = await GroupMessageTemplate.create({
      campaignGroupId: groupId,
      content,
      weight,
    })

    return template
  }

  /**
   * Mettre à jour un template de message
   */
  async updateGroupMessage(
    messageId: number,
    content?: string,
    weight?: number
  ): Promise<GroupMessageTemplate> {
    const template = await GroupMessageTemplate.findOrFail(messageId)
    
    if (content !== undefined) {
      template.content = content
    }
    
    if (weight !== undefined) {
      template.weight = weight
    }
    
    await template.save()
    return template
  }

  /**
   * Supprimer un template de message
   */
  async deleteGroupMessage(messageId: number): Promise<void> {
    const template = await GroupMessageTemplate.findOrFail(messageId)
    await template.delete()
  }
}
