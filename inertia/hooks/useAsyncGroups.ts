import { useState, useEffect, useCallback } from 'react'
import GroupService from '../services/groupService'
import type { CampaignGroup } from '../services/groupService'

interface UseAsyncGroupsReturn {
  groups: CampaignGroup[]
  loading: boolean
  estimationsLoading: boolean
  error: string | null
  refreshGroups: () => Promise<void>
  refreshEstimations: () => Promise<void>
  clearCache: () => void
}

/**
 * Hook pour la gestion asynchrone des groupes avec chargement optimisé
 */
export function useAsyncGroups(campaignId: number): UseAsyncGroupsReturn {
  const [groups, setGroups] = useState<CampaignGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [estimationsLoading, setEstimationsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupService = GroupService.getInstance()

  /**
   * Charger les groupes rapidement
   */
  const refreshGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔄 Chargement rapide des groupes...`)
      const result = await groupService.loadGroupsLight(campaignId)
      
      setGroups(result.groups)
      console.log(`✅ ${result.groups.length} groupes chargés`)
      
      // Déclencher le chargement des estimations en arrière-plan
      if (result.groups.length > 0) {
        setEstimationsLoading(true)
        loadEstimationsInBackground()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load groups')
      console.error('❌ Erreur chargement groupes:', err)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  /**
   * Charger les estimations en arrière-plan
   */
  const loadEstimationsInBackground = useCallback(async () => {
    try {
      console.log(`🔄 Chargement estimations en arrière-plan...`)
      const estimations = await groupService.loadEstimationsAsync(campaignId)
      
      // Mettre à jour les groupes avec les estimations
      setGroups(prevGroups => 
        prevGroups.map(group => {
          const estimation = estimations.find(e => e.groupId === group.id)
          return {
            ...group,
            estimated_targets: estimation?.estimatedCount || 0,
            loading_estimation: false,
          }
        })
      )
      
      console.log(`✅ Estimations appliquées aux groupes`)
    } catch (err: any) {
      console.error('❌ Erreur chargement estimations:', err)
      // En cas d'erreur, marquer les estimations comme non-loading
      setGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          loading_estimation: false,
        }))
      )
    } finally {
      setEstimationsLoading(false)
    }
  }, [campaignId])

  /**
   * Rafraîchir uniquement les estimations
   */
  const refreshEstimations = useCallback(async () => {
    try {
      setEstimationsLoading(true)
      
      // Vider le cache d'abord
      groupService.clearCache(campaignId)
      
      // Marquer les groupes comme en chargement
      setGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          loading_estimation: true,
        }))
      )
      
      await loadEstimationsInBackground()
    } catch (err: any) {
      console.error('❌ Erreur refresh estimations:', err)
    }
  }, [campaignId, loadEstimationsInBackground])

  /**
   * Vider les caches frontend et backend
   */
  const clearCache = useCallback(() => {
    groupService.clearBackendCache(campaignId)
    console.log(`🧹 Cache vidé pour campagne ${campaignId}`)
  }, [campaignId])

  // Charger les groupes au montage du composant
  useEffect(() => {
    refreshGroups()
  }, [refreshGroups])

  return {
    groups,
    loading,
    estimationsLoading,
    error,
    refreshGroups,
    refreshEstimations,
    clearCache,
  }
}

export default useAsyncGroups
