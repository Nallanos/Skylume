import CampaignGroup from '#models/campaign_group'
import FollowerCampaign from '#models/follower_campaign'
import { InterestLevel } from '#models/follower_campaign'
import DmCampaign from '#models/dm_campaign'
import Account from '#models/account'
import AccountService from '#services/account_service'
import { AtpAgent } from '@atproto/api'

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
  // Cache pour les followers de campagne
  private followersCache = new Map<number, FollowerCampaign[]>()
  private cacheTimestamps = new Map<number, number>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Obtenir les followers avec cache
   */
  private async getCachedFollowers(campaignId: number): Promise<FollowerCampaign[]> {
    const now = Date.now()
    const cacheKey = campaignId
    
    // Vérifier le cache
    if (this.followersCache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey) || 0
      if (now - timestamp < this.CACHE_TTL) {
        console.log(`📋 Cache hit pour followers campagne ${campaignId}`)
        return this.followersCache.get(cacheKey)!
      }
    }
    
    console.log(`🔄 Cache miss, rechargement followers campagne ${campaignId}`)
    const followers = await FollowerCampaign.query()
      .where('dm_campaign_id', campaignId)
    
    // Mettre en cache
    this.followersCache.set(cacheKey, followers)
    this.cacheTimestamps.set(cacheKey, now)
    
    return followers
  }

  /**
   * Vider le cache pour une campagne (méthode publique)
   */
  async clearFollowersCache(campaignId: number): Promise<void> {
    this.clearCacheForCampaign(campaignId)
    console.log(`🧹 Cache vidé pour la campagne ${campaignId}`)
  }

  /**
   * Vider le cache pour une campagne
   */
  private clearCacheForCampaign(campaignId: number): void {
    this.followersCache.delete(campaignId)
    this.cacheTimestamps.delete(campaignId)
  }
  /**
   * Créer un nouveau groupe pour une campagne
   */
  async createGroup(
    campaignId: number,
    name: string,
    conditions: GroupConditions | SimpleConditions,
    message: string,
    order?: number,
    explicitLinks?: Array<{text: string, url: string}>,
    targetCount?: number
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
      targetCount: targetCount || 0,
      messagesSent: 0,
      explicitLinks: explicitLinksData,
    })

    // ✅ NOUVEAU: Assigner automatiquement les followers au groupe créé
    await this.assignFollowersToSpecificGroup(group)

    // Vider le cache après création d'un groupe
    this.clearCacheForCampaign(campaignId)

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
      target_count: number
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

    // Map target_count to targetCount for database
    const mergeUpdates: any = { ...updates }
    if (updates.target_count !== undefined) {
      mergeUpdates.targetCount = updates.target_count
      delete mergeUpdates.target_count
    }

    group.merge(mergeUpdates)
    await group.save()

    // ✅ NOUVEAU: Si les conditions ont été mises à jour, reassigner les followers
    if (updates.conditions) {
      console.log(`🔄 Conditions updated for group ${group.name}, reassigning followers...`)
      
      // D'abord, libérer tous les followers assignés à ce groupe
      await FollowerCampaign.query()
        .where('campaign_group_id', group.id)
        .update({ campaign_group_id: null })
      
      // Puis réassigner selon les nouvelles conditions
      await this.assignFollowersToSpecificGroup(group)
      
      // Vider le cache après modification des conditions
      this.clearCacheForCampaign(group.campaignId)
    }

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
   * Calculer les estimations pour tous les groupes d'une campagne (VERSION ASYNC)
   */
  async calculateGroupEstimationsAsync(campaignId: number): Promise<GroupEstimation[]> {
    try {
      console.log(`🚀 Début calcul estimations async pour campagne ${campaignId}`)
      
      // Charger les groupes et followers en parallèle avec cache
      const [groups, followerCampaigns] = await Promise.all([
        this.getCampaignGroups(campaignId),
        this.getCachedFollowers(campaignId)
      ])

      // Calculer les estimations en parallèle pour chaque groupe
      const estimationPromises = groups.map(async (group) => {
        const matchingFollowers = this.filterFollowersByConditions(
          followerCampaigns,
          group.conditions as GroupConditions
        )

        return {
          groupId: group.id,
          groupName: group.name,
          estimatedCount: matchingFollowers.length,
          conditions: group.conditions as GroupConditions,
        }
      })

      const estimations = await Promise.all(estimationPromises)
      
      console.log(`✅ Estimations async calculées pour ${estimations.length} groupes`)
      return estimations
    } catch (error) {
      console.error(`❌ Erreur calcul estimations async:`, error)
      throw error
    }
  }

  /**
   * Calculer les estimations pour tous les groupes d'une campagne (VERSION SYNCHRONE)
   */
  async calculateGroupEstimations(campaignId: number): Promise<GroupEstimation[]> {
    const groups = await this.getCampaignGroups(campaignId)
    const followerCampaigns = await this.getCachedFollowers(campaignId)

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
   * Estimer le nombre de targets pour des conditions données (AVEC CACHE)
   */
  async estimateTargetsForConditions(campaignId: number, conditions: any): Promise<number> {
    try {
      // Récupérer les followers avec cache
      const followerCampaigns = await this.getCachedFollowers(campaignId)

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
   * Enrichir les données des followers avec les vrais comptes de followers depuis l'API Bluesky
   */
  private async enrichFollowersData(campaignId: number, followers: FollowerCampaign[]): Promise<FollowerCampaign[]> {
    console.log(`🔍 Enriching ${followers.length} followers with real follower counts from Bluesky API`)
    
    try {
      // Récupérer la campagne pour obtenir le handle du compte
      const campaign = await DmCampaign.findOrFail(campaignId)
      
      // Récupérer le compte directement par le handle
      const account = await Account.query()
        .where('handle', campaign.accountHandle)
        .first()
      
      if (!account) {
        console.warn(`No account found with handle ${campaign.accountHandle}, skipping enrichment`)
        return followers
      }

      // Initialiser l'AccountService
      const agent = new AtpAgent({ service: 'https://bsky.social' })
      const accountService = new AccountService(agent)
      await accountService.createOrResumeSession(account)

      // Enrichir chaque follower avec son vrai compte de followers
      const enrichedFollowers: FollowerCampaign[] = []
      let enrichedCount = 0
      
      for (const follower of followers) {
        try {
          if (follower.followerHandle && (!follower.followersCount || follower.followersCount === 0)) {
            // Récupérer le profil depuis l'API Bluesky seulement si pas déjà enrichi
            const profile = await accountService.getProfile(follower.followerHandle)
            
            // Mettre à jour le nombre de followers
            follower.followersCount = profile.followersCount || 0
            console.log(`Updated ${follower.followerHandle}: ${follower.followersCount} followers`)
            
            // Sauvegarder en DB pour les futures utilisations
            await follower.save()
            enrichedCount++
          }
          
          enrichedFollowers.push(follower)
        } catch (profileError) {
          console.warn(`Failed to fetch profile for ${follower.followerHandle}:`, profileError.message)
          // Garder les données existantes si on ne peut pas récupérer le profil
          enrichedFollowers.push(follower)
        }
      }

      console.log(`✅ Successfully enriched ${enrichedCount}/${enrichedFollowers.length} followers`)
      return enrichedFollowers
      
    } catch (error) {
      console.error('Error enriching followers data:', error)
      // Retourner les followers originaux si l'enrichissement échoue
      return followers
    }
  }

  /**
   * Assigner les followers à un groupe spécifique nouvellement créé
   */
  async assignFollowersToSpecificGroup(group: CampaignGroup): Promise<void> {
    console.log(`🔧 Assigning followers to new group: ${group.name} (ID: ${group.id})`)
    
    // Récupérer les followers non-assignés de cette campagne
    let followerCampaigns = await FollowerCampaign.query()
      .where('dm_campaign_id', group.campaignId)
      .whereNull('campaign_group_id') // Seulement les non-assignés

    console.log(`Found ${followerCampaigns.length} unassigned followers`)

    // Enrichir les données des followers avec les vrais comptes depuis l'API Bluesky
    followerCampaigns = await this.enrichFollowersData(group.campaignId, followerCampaigns)

    // Évaluer les conditions du groupe
    const conditions = group.conditions as GroupConditions | SimpleConditions
    let eligibleFollowers: FollowerCampaign[] = []

    console.log(`Evaluating complex conditions with conditions ${JSON.stringify(conditions)}`)
    if (this.isSimpleConditions(conditions)) {
      // Format simple depuis le frontend
      eligibleFollowers = followerCampaigns.filter(fc => 
        this.evaluateSimpleCondition(fc, conditions as SimpleConditions)
      )
    } else {
      // Format complexe
      eligibleFollowers = followerCampaigns.filter(fc => 
        this.evaluateConditions(fc, conditions as GroupConditions)
      )
    }

    console.log(`Found ${eligibleFollowers.length} eligible followers for group ${group.name}`)

    // Assigner ces followers au groupe
    if (eligibleFollowers.length > 0) {
      const followerIds = eligibleFollowers.map(fc => fc.id)
      
      await FollowerCampaign.query()
        .whereIn('id', followerIds)
        .update({ campaign_group_id: group.id })

      // Mettre à jour le nombre cible du groupe
      await group.merge({ targetCount: eligibleFollowers.length }).save()
      
      console.log(`✅ Assigned ${eligibleFollowers.length} followers to group ${group.name}`)
    } else {
      console.log(`⚠️ No eligible followers found for group ${group.name}`)
    }
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
   * Évaluer une condition simple depuis le frontend
   */
  private evaluateSimpleCondition(follower: FollowerCampaign, condition: SimpleConditions): boolean {
    const { field, operator, value } = condition

    switch (field) {
      case 'interest_level':
        const currentLevel = follower.interestLevel
        if (operator === 'equals') {
          return currentLevel === value
        } else if (operator === 'at_least') {
          // Définir la hiérarchie des niveaux d'intérêt
          const levelHierarchy: Record<string, number> = {
            'interested': 3,
            'moderately_interested': 2,
            'not_interested': 1,
            'excluded': 0,
            'cannot_determine': 0,
          }
          const currentScore = levelHierarchy[currentLevel as string] || 0
          const targetScore = levelHierarchy[value] || 0
          return currentScore >= targetScore
        }
        return false

      case 'follower_count':
      case 'followers_count':
        const followersCount = follower.followersCount || 0
        console.log(`Evaluating follower count condition: follower has ${followersCount}, condition is ${operator} ${value}`)
        const targetValue = parseInt(value)
        
        switch (operator) {
          case 'equals':
            return followersCount === targetValue
          case 'greater_than':
            return followersCount > targetValue
          case 'less_than':
            return followersCount < targetValue
          case 'gte':
          case 'greater_than_or_equal':
            return followersCount >= targetValue
          case 'lte':
          case 'less_than_or_equal':
            return followersCount <= targetValue
          default:
            return false
        }

      default:
        console.warn(`Unknown field in simple condition: ${field}`)
        return false
    }
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
