import CampaignGroup from '#models/campaign_group'
import FollowerCampaign from '#models/follower_campaign'
import { InterestLevel } from '#models/follower_campaign'

export type ConditionType = 'interest_level' | 'follower_count'
export type OperatorType = 'equals' | 'greater_than' | 'less_than' | 'between' | 'at_least'

export interface Condition {
  type: ConditionType
  operator: OperatorType
  value: any
  secondValue?: any // Pour l'opérateur "between"
}

export interface GroupConditions {
  conditions: Condition[]
  logic: 'AND' | 'OR' // Comment combiner les conditions
}

// Format simple depuis le frontend
export interface SimpleConditions {
  field: string
  operator: string
  value: string
}

export interface GroupEstimation {
  groupId: number
  groupName: string
  estimatedCount: number
  conditions: GroupConditions
}

export default class GroupService {
  /**
   * Créer un nouveau groupe pour une campagne
   */
  async createGroup(
    campaignId: number,
    name: string,
    conditions: GroupConditions | SimpleConditions,
    message: string,
    order?: number,
    explicitLinks?: Array<{text: string, url: string}>
  ): Promise<CampaignGroup> {
    // Normaliser les conditions vers le format uniforme pour la sauvegarde
    let normalizedConditions: any
    
    if (this.isSimpleConditions(conditions)) {
      // Format simple depuis le frontend - on le sauvegarde tel quel
      normalizedConditions = conditions
    } else {
      // Format complexe - on le valide d'abord
      this.validateConditions(conditions as GroupConditions)
      normalizedConditions = conditions
    }

    // Déterminer l'ordre si non spécifié
    if (!order) {
      const result = await CampaignGroup.query()
        .where('campaign_id', campaignId)
        .max('order as max_order')
        .first()
      
      order = (result?.$extras.max_order || 0) + 1
    }

    // Préparer les liens explicites pour la sauvegarde
    const explicitLinksData = explicitLinks && explicitLinks.length > 0 
      ? explicitLinks
      : null

    const group = await CampaignGroup.create({
      campaignId,
      name,
      conditions: normalizedConditions,
      message,
      order,
      targetCount: 0, // Sera calculé plus tard
      messagesSent: 0,
      explicitLinks: explicitLinksData,
    })

    return group
  }

  /**
   * Vérifier si les conditions sont au format simple
   */
  private isSimpleConditions(conditions: any): conditions is SimpleConditions {
    return conditions && 
           typeof conditions.field === 'string' && 
           typeof conditions.operator === 'string' && 
           typeof conditions.value === 'string'
  }

  /**
   * Mettre à jour un groupe
   */
  async updateGroup(
    groupId: number,
    updates: Partial<{
      name: string
      conditions: GroupConditions | SimpleConditions
      message: string
      order: number
      explicitLinks: Array<{text: string, url: string}>
    }>
  ): Promise<CampaignGroup> {
    const group = await CampaignGroup.findOrFail(groupId)

    // Normaliser les conditions vers le format simple si nécessaire
    if (updates.conditions) {
      if (this.isSimpleConditions(updates.conditions)) {
        // Format simple - on le garde tel quel
        updates.conditions = updates.conditions
      } else {
        // Format complexe - on le valide d'abord
        this.validateConditions(updates.conditions as GroupConditions)
      }
    }

    // Préparer les liens explicites pour la sauvegarde si fournis
    if (updates.explicitLinks !== undefined) {
      const explicitLinksJson = updates.explicitLinks && updates.explicitLinks.length > 0 
        ? JSON.stringify(updates.explicitLinks)
        : null
      updates.explicitLinks = explicitLinksJson as any
    }

    group.merge(updates)
    await group.save()

    return group
  }

  /**
   * Supprimer un groupe
   */
  async deleteGroup(groupId: number): Promise<void> {
    const group = await CampaignGroup.findOrFail(groupId)
    await group.delete()
  }

  /**
   * Récupérer tous les groupes d'une campagne
   */
  async getCampaignGroups(campaignId: number): Promise<CampaignGroup[]> {
    return await CampaignGroup.query()
      .where('campaign_id', campaignId)
      .orderBy('order', 'asc')
  }

  /**
   * Réorganiser l'ordre des groupes
   */
  async reorderGroups(campaignId: number, groupIdsInOrder: number[]): Promise<void> {
    for (let i = 0; i < groupIdsInOrder.length; i++) {
      await CampaignGroup.query()
        .where('id', groupIdsInOrder[i])
        .where('campaign_id', campaignId)
        .update({ order: i + 1 })
    }
  }

  /**
   * Calculer les estimations pour tous les groupes d'une campagne
   */
  async calculateGroupEstimations(campaignId: number): Promise<GroupEstimation[]> {
    const groups = await this.getCampaignGroups(campaignId)
    const followerCampaigns = await FollowerCampaign.query()
      .where('dm_campaign_id', campaignId)

    const estimations: GroupEstimation[] = []

    for (const group of groups) {
      const matchingFollowers = this.filterFollowersByConditions(
        followerCampaigns,
        group.conditions as GroupConditions
      )

      estimations.push({
        groupId: group.id,
        groupName: group.name,
        estimatedCount: matchingFollowers.length,
        conditions: group.conditions as GroupConditions,
      })
    }

    return estimations
  }

  /**
   * Estimer le nombre de targets pour des conditions données
   */
  async estimateTargetsForConditions(campaignId: number, conditions: any): Promise<number> {
    try {
      // Récupérer tous les followers de la campagne
      const followerCampaigns = await FollowerCampaign.query()
        .where('dm_campaign_id', campaignId)

      // Appliquer le filtre simple directement
      const matchingFollowers = this.filterFollowersBySimpleConditions(
        followerCampaigns,
        conditions
      )

      return matchingFollowers.length
    } catch (error) {
      console.error('Error estimating targets:', error)
      return 0
    }
  }

  /**
   * Filtrer les followers selon des conditions simples
   */
  private filterFollowersBySimpleConditions(
    followers: FollowerCampaign[],
    conditions: any
  ): FollowerCampaign[] {
    const { field, operator, value } = conditions
    
    if (!field || !operator || !value) {
      return []
    }

    return followers.filter(follower => {
      let followerValue: number

      // Récupérer la valeur du follower selon le champ
      switch (field) {
        case 'followers_count':
          followerValue = follower.followersCount || 0
          break
        default:
          return false
      }

      const targetValue = parseInt(value, 10)

      // Appliquer l'opérateur
      switch (operator) {
        case 'gte':
          return followerValue >= targetValue
        case 'lte':
          return followerValue <= targetValue
        case 'gt':
          return followerValue > targetValue
        case 'lt':
          return followerValue < targetValue
        case 'eq':
          return followerValue === targetValue
        default:
          return false
      }
    })
  }

  /**
   * Convertir les conditions du frontend en format GroupConditions
   */
  /**
   * Assigner les followers aux groupes en fonction des conditions
   * Les groupes sont traités par ordre de priorité (order ASC)
   */
  async assignFollowersToGroups(campaignId: number): Promise<void> {
    const groups = await this.getCampaignGroups(campaignId)
    const followerCampaigns = await FollowerCampaign.query()
      .where('dm_campaign_id', campaignId)
      .whereNull('campaign_group_id') // Seulement les non-assignés

    // Créer un set des followers déjà assignés pour éviter les doublons
    const assignedFollowerIds = new Set<number>()

    for (const group of groups) {
      const conditions = group.conditions as GroupConditions
      const eligibleFollowers = followerCampaigns.filter(fc => 
        !assignedFollowerIds.has(fc.id) && 
        this.evaluateConditions(fc, conditions)
      )

      // Assigner ces followers au groupe
      const followerIds = eligibleFollowers.map(fc => fc.id)
      if (followerIds.length > 0) {
        await FollowerCampaign.query()
          .whereIn('id', followerIds)
          .update({ campaign_group_id: group.id })

        // Marquer ces followers comme assignés
        followerIds.forEach(id => assignedFollowerIds.add(id))

        // Mettre à jour le nombre cible du groupe
        await group.merge({ targetCount: followerIds.length }).save()
      }
    }
  }

  /**
   * Filtrer les followers selon les conditions d'un groupe
   */
  private filterFollowersByConditions(
    followers: FollowerCampaign[],
    conditions: GroupConditions
  ): FollowerCampaign[] {
    return followers.filter(follower => this.evaluateConditions(follower, conditions))
  }

  /**
   * Évaluer si un follower correspond aux conditions d'un groupe
   */
  private evaluateConditions(follower: FollowerCampaign, groupConditions: GroupConditions): boolean {
    const { conditions, logic } = groupConditions

    if (logic === 'AND') {
      return conditions.every(condition => this.evaluateCondition(follower, condition))
    } else {
      return conditions.some(condition => this.evaluateCondition(follower, condition))
    }
  }

  /**
   * Évaluer une condition individuelle
   */
  private evaluateCondition(follower: FollowerCampaign, condition: Condition): boolean {
    switch (condition.type) {
      case 'interest_level':
        return this.evaluateInterestLevel(follower, condition)
      case 'follower_count':
        return this.evaluateFollowerCount(follower, condition)
      default:
        console.warn(`Unknown condition type: ${condition.type}`)
        return false
    }
  }

  /**
   * Évaluer une condition sur le niveau d'intérêt
   */
  private evaluateInterestLevel(follower: FollowerCampaign, condition: Condition): boolean {
    const currentLevel = follower.interestLevel
    const targetLevel = condition.value as InterestLevel

    switch (condition.operator) {
      case 'equals':
        return currentLevel === targetLevel
      case 'at_least':
        // Définir la hiérarchie des niveaux d'intérêt
        const levelHierarchy: Record<InterestLevel, number> = {
          'interested': 3,
          'moderately_interested': 2,
          'not_interested': 1,
          'excluded': 0,
          'cannot_determine': 0,
        }
        const currentScore = levelHierarchy[currentLevel as InterestLevel] || 0
        const targetScore = levelHierarchy[targetLevel] || 0
        return currentScore >= targetScore
      default:
        return false
    }
  }

  /**
   * Évaluer une condition sur le nombre de followers
   */
  private evaluateFollowerCount(follower: FollowerCampaign, condition: Condition): boolean {
    const followersCount = follower.followersCount || 0
    const targetValue = condition.value as number

    switch (condition.operator) {
      case 'equals':
        return followersCount === targetValue
      case 'greater_than':
        return followersCount > targetValue
      case 'less_than':
        return followersCount < targetValue
      case 'between':
        const secondValue = condition.secondValue as number
        return followersCount >= targetValue && followersCount <= secondValue
      case 'at_least':
        return followersCount >= targetValue
      default:
        return false
    }
  }

  /**
   * Valider la structure des conditions
   */
  private validateConditions(conditions: GroupConditions): void {
    if (!conditions.conditions || !Array.isArray(conditions.conditions)) {
      throw new Error('Conditions must be an array')
    }

    if (conditions.conditions.length === 0) {
      throw new Error('At least one condition is required')
    }

    if (!['AND', 'OR'].includes(conditions.logic)) {
      throw new Error('Logic must be either AND or OR')
    }

    for (const condition of conditions.conditions) {
      this.validateCondition(condition)
    }
  }

  /**
   * Valider une condition individuelle
   */
  private validateCondition(condition: Condition): void {
    const validTypes: ConditionType[] = ['interest_level', 'follower_count']
    const validOperators: OperatorType[] = ['equals', 'greater_than', 'less_than', 'between', 'at_least']

    if (!validTypes.includes(condition.type)) {
      throw new Error(`Invalid condition type: ${condition.type}`)
    }

    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid operator: ${condition.operator}`)
    }

    if (condition.value === undefined || condition.value === null) {
      throw new Error('Condition value is required')
    }

    if (condition.operator === 'between' && !condition.secondValue) {
      throw new Error('Second value is required for "between" operator')
    }

    // Validation spécifique selon le type
    if (condition.type === 'interest_level') {
      const validLevels: InterestLevel[] = ['interested', 'moderately_interested', 'not_interested', 'excluded', 'cannot_determine']
      if (!validLevels.includes(condition.value as InterestLevel)) {
        throw new Error(`Invalid interest level: ${condition.value}`)
      }
    }

    if (condition.type === 'follower_count') {
      if (typeof condition.value !== 'number' || condition.value < 0) {
        throw new Error('Follower count must be a positive number')
      }
      if (condition.operator === 'between' && (typeof condition.secondValue !== 'number' || condition.secondValue < 0)) {
        throw new Error('Second value for follower count must be a positive number')
      }
    }
  }

  /**
   * Obtenir les followers d'un groupe spécifique
   */
  async getGroupFollowers(groupId: number): Promise<FollowerCampaign[]> {
    return await FollowerCampaign.query()
      .where('campaign_group_id', groupId)
      .orderBy('similarity_score', 'desc')
  }

  /**
   * Réinitialiser les assignations de groupes pour une campagne
   */
  async resetGroupAssignments(campaignId: number): Promise<void> {
    await FollowerCampaign.query()
      .where('dm_campaign_id', campaignId)
      .update({ campaign_group_id: null })

    await CampaignGroup.query()
      .where('campaign_id', campaignId)
      .update({ targetCount: 0, messagesSent: 0 })
  }
}
