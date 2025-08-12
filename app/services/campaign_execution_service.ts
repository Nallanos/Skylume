import { inject } from '@adonisjs/core'
import DmCampaign from '#models/dm_campaign'
import CampaignMessage from '#models/campaign_message'
import FollowerCampaign from '#models/follower_campaign'
import CampaignMessageService from './campaign_message_service.js'

interface ExecutionConfig {
  enabled: boolean
  message: string
  order: number
  targetCount: number
  messagesSentCount: number
  priorityOrder: number
}

interface ExecutionSettings {
  categories: {
    [key: string]: ExecutionConfig
  }
  delayBetweenMessages: number
  dailyLimit?: number
}

interface ExecutionPreview {
  totalFollowers: number
  categoriesBreakdown: {
    [key: string]: {
      count: number
      enabled: boolean
    }
  }
  estimatedDuration: number
  totalMessages: number
}

@inject()
export default class CampaignExecutionService {
  constructor(
    protected campaignMessageService: CampaignMessageService
  ) {}

  /**
   * Récupérer la configuration d'exécution d'une campagne
   */
  public async getExecutionConfig(campaignId: number): Promise<ExecutionSettings> {
    const messages = await this.campaignMessageService.getCampaignMessages(campaignId)
    
    const categories: { [key: string]: ExecutionConfig } = {}
    
    // Initialiser toutes les catégories possibles
    const allCategories = ['interested', 'moderately_interested', 'not_interested', 'excluded', 'cannot_determine']
    
    for (const category of allCategories) {
      const message = messages.find(m => m.interestLevel === category)
      categories[category] = {
        enabled: message?.enabled || false,
        message: message?.message || '',
        order: message?.executionOrder || 0,
        targetCount: message?.targetCount || 0,
        messagesSentCount: message?.messagesSentCount || 0,
        priorityOrder: message?.priorityOrder || 0
      }
    }

    return {
      categories,
      delayBetweenMessages: 5000, // 5 secondes par défaut
      dailyLimit: 50
    }
  }

  /**
   * Sauvegarder la configuration d'exécution
   */
  public async saveExecutionConfig(
    campaignId: number, 
    config: ExecutionSettings
  ): Promise<void> {
    for (const [interestLevel, categoryConfig] of Object.entries(config.categories)) {
      // Trouver le message existant ou en créer un nouveau
      let message = await CampaignMessage.query()
        .where('dmCampaignId', campaignId)
        .where('interestLevel', interestLevel)
        .first()

      if (message) {
        // Mettre à jour le message existant
        message.message = categoryConfig.message
        message.enabled = categoryConfig.enabled
        message.executionOrder = categoryConfig.order
        message.targetCount = categoryConfig.targetCount
        message.priorityOrder = categoryConfig.priorityOrder
        message.isActive = true
        await message.save()
      } else if (categoryConfig.enabled && categoryConfig.message.trim()) {
        // Créer un nouveau message si la catégorie est activée
        await this.campaignMessageService.createMessage({
          dmCampaignId: campaignId,
          interestLevel: interestLevel as 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine',
          message: categoryConfig.message
        })
        
        // Mettre à jour les champs supplémentaires
        const newMessage = await CampaignMessage.query()
          .where('dmCampaignId', campaignId)
          .where('interestLevel', interestLevel)
          .first()
        
        if (newMessage) {
          newMessage.enabled = categoryConfig.enabled
          newMessage.executionOrder = categoryConfig.order
          newMessage.targetCount = categoryConfig.targetCount
          newMessage.priorityOrder = categoryConfig.priorityOrder
          await newMessage.save()
        }
      }
    }
  }

  /**
   * Valider la configuration d'exécution
   */
  public async validateExecutionConfig(campaignId: number): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    
    const config = await this.getExecutionConfig(campaignId)
    const enabledCategories = Object.entries(config.categories)
      .filter(([_, categoryConfig]) => categoryConfig.enabled)

    // Vérifications obligatoires
    if (enabledCategories.length === 0) {
      errors.push('Au moins une catégorie doit être activée')
    }

    for (const [category, categoryConfig] of enabledCategories) {
      if (!categoryConfig.message.trim()) {
        errors.push(`La catégorie "${category}" est activée mais n'a pas de message`)
      }
      
      if (categoryConfig.message.length > 280) {
        errors.push(`Le message pour "${category}" dépasse 280 caractères`)
      }
    }

    // Vérifications et avertissements
    const campaign = await DmCampaign.findOrFail(campaignId)
    if (campaign.analysisStatus !== 'completed') {
      warnings.push('L\'analyse de la campagne n\'est pas terminée')
    }

    const preview = await this.getExecutionPreview(campaignId)
    if (preview.totalMessages > 100) {
      warnings.push(`${preview.totalMessages} messages seront envoyés. Assurez-vous de respecter les limites de taux`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Générer un aperçu de l'exécution
   */
  public async getExecutionPreview(campaignId: number): Promise<ExecutionPreview> {
    const config = await this.getExecutionConfig(campaignId)
    
    // Compter les followers par catégorie
    const followerStats = await FollowerCampaign.query()
      .where('dmCampaignId', campaignId)
      .select('interestLevel')
      .count('* as count')
      .groupBy('interestLevel')

    const categoriesBreakdown: { [key: string]: { count: number; enabled: boolean } } = {}
    let totalMessages = 0

    // Initialiser toutes les catégories
    for (const [category, categoryConfig] of Object.entries(config.categories)) {
      const stat = followerStats.find(s => s.interestLevel === category)
      const availableCount = stat ? Number(stat.$extras.count) : 0
      
      // Calculer le nombre effectif de messages qui seront envoyés
      let effectiveCount = 0
      if (categoryConfig.enabled) {
        if (categoryConfig.targetCount > 0) {
          // Utiliser le target count spécifique, limité par le nombre disponible
          effectiveCount = Math.min(categoryConfig.targetCount - categoryConfig.messagesSentCount, availableCount)
          effectiveCount = Math.max(0, effectiveCount) // Éviter les valeurs négatives
        } else {
          // Si pas de target count, utiliser tous les followers disponibles
          effectiveCount = availableCount
        }
      }
      
      categoriesBreakdown[category] = {
        count: effectiveCount,
        enabled: categoryConfig.enabled
      }
      
      totalMessages += effectiveCount
    }

    const totalFollowers = Object.values(categoriesBreakdown)
      .reduce((sum, cat) => sum + cat.count, 0)

    // Estimation du temps (5 secondes entre chaque message par défaut)
    const estimatedDuration = totalMessages * (config.delayBetweenMessages / 1000)

    return {
      totalFollowers,
      categoriesBreakdown,
      estimatedDuration,
      totalMessages
    }
  }

  /**
   * Récupérer les followers à contacter selon la configuration
   */
  public async getFollowersToContact(campaignId: number): Promise<FollowerCampaign[]> {
    const config = await this.getExecutionConfig(campaignId)
    
    const enabledCategories = Object.entries(config.categories)
      .filter(([_, categoryConfig]) => categoryConfig.enabled)
      .sort((a, b) => a[1].priorityOrder - b[1].priorityOrder) // Trier par ordre de priorité

    if (enabledCategories.length === 0) {
      return []
    }

    const allFollowers: FollowerCampaign[] = []

    // Pour chaque catégorie, récupérer les followers selon le target count
    for (const [category, categoryConfig] of enabledCategories) {
      let limit = undefined
      
      if (categoryConfig.targetCount > 0) {
        const remaining = categoryConfig.targetCount - categoryConfig.messagesSentCount
        if (remaining <= 0) {
          continue // Skip cette catégorie si le target est déjà atteint
        }
        limit = remaining
      }

      const followers = await FollowerCampaign.query()
        .where('dmCampaignId', campaignId)
        .where('interestLevel', category)
        .where('messageSent', false)
        .where('alreadyContacted', false)
        .orderBy('similarityScore', 'desc')
        .if(limit !== undefined, (query) => query.limit(limit!))

      allFollowers.push(...followers)
    }

    return allFollowers
  }

  /**
   * Obtenir le message approprié pour un follower
   */
  public async getMessageForFollower(
    campaignId: number, 
    follower: FollowerCampaign
  ): Promise<CampaignMessage | null> {
    if (!follower.interestLevel) {
      return null
    }

    const message = await CampaignMessage.query()
      .where('dmCampaignId', campaignId)
      .where('interestLevel', follower.interestLevel)
      .where('enabled', true)
      .where('isActive', true)
      .first()

    return message
  }

  /**
   * Incrémenter le compteur de messages envoyés pour une catégorie
   */
  public async incrementMessagesSentCount(
    campaignId: number, 
    interestLevel: string
  ): Promise<void> {
    const message = await CampaignMessage.query()
      .where('dmCampaignId', campaignId)
      .where('interestLevel', interestLevel)
      .first()

    if (message) {
      message.messagesSentCount = (message.messagesSentCount || 0) + 1
      await message.save()
    }
  }

  /**
   * Réinitialiser les compteurs de messages envoyés pour une campagne
   */
  public async resetMessagesSentCounts(campaignId: number): Promise<void> {
    await CampaignMessage.query()
      .where('dmCampaignId', campaignId)
      .update({ messagesSentCount: 0 })
  }
}
