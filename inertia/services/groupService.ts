/**
 * Service frontend pour la gestion asynchrone des groupes
 */

interface GroupEstimation {
  groupId: number
  groupName: string
  estimatedCount: number
  conditions: any
}

interface CampaignGroup {
  id: number
  campaignId: number
  name: string
  conditions: Record<string, any>
  message?: string
  order: number
  targetCount: number
  messagesSent: number
  createdAt: string
  updatedAt: string
  explicitLinks?: Array<{text: string, url: string}> | null
  loading_estimation?: boolean
}

class GroupService {
  private static instance: GroupService
  
  // Cache des estimations côté client
  private estimationsCache = new Map<string, GroupEstimation[]>()
  private cacheTimestamps = new Map<string, number>()
  private readonly CACHE_TTL = 2 * 60 * 1000 // 2 minutes

  public static getInstance(): GroupService {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService()
    }
    return GroupService.instance
  }

  /**
   * Obtenir le token CSRF
   */
  private getCsrfToken(): string {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    return token || ''
  }

  /**
   * Charger les groupes sans estimations (rapide)
   */
  async loadGroupsLight(campaignId: number): Promise<{ success: boolean, groups: CampaignGroup[] }> {
    try {
      console.log(`🚀 Chargement léger des groupes pour campagne ${campaignId}`)
      
      const response = await fetch(`/campaign/${campaignId}/groups?estimations=false`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        }
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ ${result.groups.length} groupes chargés rapidement`)
        return result
      } else {
        throw new Error(result.message || 'Failed to load groups')
      }
    } catch (error) {
      console.error('❌ Erreur chargement groupes:', error)
      throw error
    }
  }

  /**
   * Charger les estimations en arrière-plan
   */
  async loadEstimationsAsync(campaignId: number): Promise<GroupEstimation[]> {
    const cacheKey = `campaign_${campaignId}`
    const now = Date.now()
    
    // Vérifier le cache
    if (this.estimationsCache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey) || 0
      if (now - timestamp < this.CACHE_TTL) {
        console.log(`📋 Cache hit estimations campagne ${campaignId}`)
        return this.estimationsCache.get(cacheKey)!
      }
    }

    try {
      console.log(`🔄 Chargement estimations async pour campagne ${campaignId}`)
      
      const response = await fetch(`/campaign/${campaignId}/groups/estimations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        }
      })

      const result = await response.json()
      
      if (result.success) {
        // Mettre en cache
        this.estimationsCache.set(cacheKey, result.data)
        this.cacheTimestamps.set(cacheKey, now)
        
        console.log(`✅ ${result.data.length} estimations chargées`)
        return result.data
      } else {
        throw new Error(result.message || 'Failed to load estimations')
      }
    } catch (error) {
      console.error('❌ Erreur chargement estimations:', error)
      throw error
    }
  }

  /**
   * Charger l'estimation d'un seul groupe
   */
  async loadSingleEstimation(campaignId: number, groupId: number): Promise<GroupEstimation> {
    try {
      console.log(`🎯 Chargement estimation groupe ${groupId}`)
      
      const response = await fetch(`/campaign/${campaignId}/groups/${groupId}/estimation`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        }
      })

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Estimation groupe ${groupId}: ${result.data.estimatedCount}`)
        return result.data
      } else {
        throw new Error(result.message || 'Failed to load group estimation')
      }
    } catch (error) {
      console.error(`❌ Erreur estimation groupe ${groupId}:`, error)
      throw error
    }
  }

  /**
   * Déclencher le calcul des estimations en arrière-plan
   */
  async triggerAsyncEstimations(campaignId: number): Promise<void> {
    try {
      console.log(`🔥 Déclenchement calcul async campagne ${campaignId}`)
      
      await fetch(`/campaign/${campaignId}/groups/estimations-async`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        }
      })

      console.log(`✅ Calcul async déclenché`)
    } catch (error) {
      console.error('❌ Erreur déclenchement async:', error)
    }
  }

  /**
   * Vider le cache frontend
   */
  clearCache(campaignId?: number): void {
    if (campaignId) {
      const cacheKey = `campaign_${campaignId}`
      this.estimationsCache.delete(cacheKey)
      this.cacheTimestamps.delete(cacheKey)
      console.log(`🧹 Cache frontend vidé pour campagne ${campaignId}`)
    } else {
      this.estimationsCache.clear()
      this.cacheTimestamps.clear()
      console.log(`🧹 Tout le cache frontend vidé`)
    }
  }

  /**
   * Vider le cache backend
   */
  async clearBackendCache(campaignId: number): Promise<void> {
    try {
      await fetch(`/campaign/${campaignId}/groups/clear-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        }
      })
      
      // Vider aussi le cache frontend
      this.clearCache(campaignId)
      
      console.log(`🧹 Cache backend et frontend vidé pour campagne ${campaignId}`)
    } catch (error) {
      console.error('❌ Erreur vidage cache backend:', error)
    }
  }
}

export default GroupService
export type { CampaignGroup, GroupEstimation }
