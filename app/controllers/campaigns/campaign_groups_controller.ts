import type { HttpContext } from '@adonisjs/core/http'
import GroupService from '#services/group_service'
import CampaignGroup from '#models/campaign_group'
import { groupSimpleCreateValidator, groupSimpleUpdateValidator } from '#validators/campaign_group_simple_validator'

export default class CampaignGroupsController {
  private groupService = new GroupService()

  /**
   * GET /campaign/:id/groups
   * Récupérer tous les groupes d'une campagne avec estimations (OPTIMISÉ)
   */
  async index({ params, response, request }: HttpContext) {
    try {
      const campaignId = params.id
      const includeEstimations = request.input('estimations', 'false') === 'true'
      
      // Charger les groupes rapidement
      const groups = await CampaignGroup.query()
        .where('campaign_id', campaignId)
        .orderBy('order', 'asc')
      
      let enrichedGroups = groups.map(group => {
        const groupJson = group.toJSON()
        return {
          ...groupJson,
          id: groupJson.id, // Assurer que l'ID est présent
          priority: groupJson.order, // Alias pour la compatibilité frontend
          estimated_targets: 0, // Par défaut, sera calculé en arrière-plan
          target_count: groupJson.targetCount || 0, // Nombre réel de followers assignés
          messages_sent: groupJson.messagesSent || 0, // Nombre de messages envoyés
          explicit_links: groupJson.explicitLinks || [],
          loading_estimation: !includeEstimations, // Indicateur de chargement
        }
      })

      // Si les estimations sont demandées, les calculer
      if (includeEstimations) {
        const estimations = await this.groupService.calculateGroupEstimations(campaignId)
        enrichedGroups = enrichedGroups.map(enrichedGroup => {
          const estimation = estimations.find(e => e.groupId === enrichedGroup.id)
          return {
            ...enrichedGroup,
            estimated_targets: estimation?.estimatedCount || 0,
            loading_estimation: false,
          }
        })
      }
      
      return response.ok({
        success: true,
        groups: enrichedGroups,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to fetch groups',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/groups/estimations-async
   * Calculer les estimations en arrière-plan (NOUVEAU - ASYNC)
   */
  async estimationsAsync({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      
      // Déclencher le calcul en arrière-plan sans bloquer
      this.groupService.calculateGroupEstimationsAsync(campaignId)
        .then((estimations: any[]) => {
          console.log(`✅ Estimations calculées pour la campagne ${campaignId}:`, estimations.length)
        })
        .catch((error: any) => {
          console.error(`❌ Erreur calcul estimations campagne ${campaignId}:`, error)
        })
      
      return response.ok({
        success: true,
        message: 'Estimation calculation started in background',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to start estimation calculation',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/groups
   * Créer un nouveau groupe
   */
  async store({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const payload = await request.validateUsing(groupSimpleCreateValidator)
      
      // Sauvegarder directement le format frontend (plus simple)
      const group = await this.groupService.createGroup(
        campaignId,
        payload.name,
        payload.conditions, // Format simple : { field, operator, value }
        payload.message || '', // message depuis le frontend
        payload.priority || 1,
        payload.explicit_links || undefined, // ✅ NOUVEAU: passer les liens explicites
        payload.target_count || 0 // ✅ NOUVEAU: passer le target count
      )
      
      return response.created({
        success: true,
        data: group,
        message: 'Group created successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to create group',
        error: error.message,
      })
    }
  }

  /**
   * PUT /campaign/:id/groups/:groupId
   * Mettre à jour un groupe
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const { groupId } = params
      const payload = await request.validateUsing(groupSimpleUpdateValidator)
      
      // ✅ SIMPLIFIÉ: Garder le format simple des conditions
      let updateData: any = {}
      if (payload.name) {
        updateData.name = payload.name
      }
      if (payload.conditions) {
        updateData.conditions = payload.conditions // ✅ Format simple direct
      }
      if (payload.priority !== undefined) {
        updateData.order = payload.priority
      }
      if (payload.message !== undefined) {
        updateData.message = payload.message
      }
      if (payload.target_count !== undefined) {
        updateData.target_count = payload.target_count
      }
      if (payload.explicit_links !== undefined) {
        updateData.explicitLinks = payload.explicit_links // ✅ NOUVEAU: gérer les liens explicites
      }
      
      const group = await this.groupService.updateGroup(groupId, updateData)
      
      return response.ok({
        success: true,
        data: group,
        message: 'Group updated successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to update group',
        error: error.message,
      })
    }
  }

  /**
   * DELETE /campaign/:id/groups/:groupId
   * Supprimer un groupe
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const { groupId } = params
      await this.groupService.deleteGroup(groupId)
      
      return response.ok({
        success: true,
        message: 'Group deleted successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to delete group',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/groups/reorder
   * Réorganiser l'ordre des groupes
   */
  async reorder({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const { groupIds } = request.only(['groupIds'])
      
      await this.groupService.reorderGroups(campaignId, groupIds)
      
      return response.ok({
        success: true,
        message: 'Groups reordered successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to reorder groups',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/groups/estimations
   * Obtenir les estimations de taille pour tous les groupes (OPTIMISÉ)
   */
  async estimations({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      
      // Utiliser la version async optimisée
      const estimations = await this.groupService.calculateGroupEstimationsAsync(campaignId)
      
      return response.ok({
        success: true,
        data: estimations,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to calculate estimations',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/groups/estimate
   * Estimer le nombre de targets pour des conditions données
   */
  async estimate({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const { conditions } = request.only(['conditions'])
      
      if (!conditions) {
        return response.badRequest({
          success: false,
          message: 'Missing conditions',
        })
      }

      // Support pour le nouveau format (array) et l'ancien format (object)
      let normalizedConditions
      
      if (Array.isArray(conditions)) {
        // Nouveau format: array de conditions
        if (conditions.length === 0) {
          return response.badRequest({
            success: false,
            message: 'At least one condition is required',
          })
        }
        
        // Vérifier que toutes les conditions sont complètes
        for (const condition of conditions) {
          if (!condition.field || !condition.operator || !condition.value) {
            return response.badRequest({
              success: false,
              message: 'All conditions must have field, operator, and value',
            })
          }
        }
        
        normalizedConditions = conditions
      } else if (conditions.field && conditions.operator && conditions.value) {
        // Ancien format: single condition object
        normalizedConditions = [conditions]
      } else {
        return response.badRequest({
          success: false,
          message: 'Invalid conditions format',
        })
      }
      
      const estimatedTargets = await this.groupService.estimateTargetsForConditions(campaignId, normalizedConditions)
      
      return response.ok({
        success: true,
        estimated_targets: estimatedTargets,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to estimate targets',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/groups/assign
   * Assigner les followers aux groupes
   */
  async assignFollowers({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      await this.groupService.assignFollowersToGroups(campaignId)
      
      return response.ok({
        success: true,
        message: 'Followers assigned to groups successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to assign followers',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/groups/:groupId/estimation
   * Obtenir l'estimation pour un groupe spécifique (NOUVEAU - OPTIMISÉ)
   */
  async getSingleEstimation({ params, response }: HttpContext) {
    try {
      const { id: campaignId, groupId } = params
      
      // Charger le groupe spécifique
      const group = await CampaignGroup.findOrFail(groupId)
      
      // Estimer uniquement pour ce groupe avec cache
      const estimation = await this.groupService.estimateTargetsForConditions(
        campaignId,
        group.conditions
      )
      
      return response.ok({
        success: true,
        data: {
          groupId: group.id,
          groupName: group.name,
          estimatedCount: estimation,
          conditions: group.conditions,
        },
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to calculate group estimation',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/groups/:groupId/followers
   * Obtenir les followers d'un groupe spécifique
   */
  async getGroupFollowers({ params, response }: HttpContext) {
    try {
      const { groupId } = params
      const followers = await this.groupService.getGroupFollowers(groupId)
      
      return response.ok({
        success: true,
        data: followers,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to fetch group followers',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/groups/clear-cache
   * Vider le cache des followers pour forcer le rechargement (NOUVEAU - ADMIN)
   */
  async clearCache({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      
      // Vider le cache pour cette campagne
      await this.groupService.clearFollowersCache(campaignId)
      
      return response.ok({
        success: true,
        message: 'Cache cleared successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to clear cache',
        error: error.message,
      })
    }
  }

  /**
   * Convertir les conditions frontend (format simple) en conditions GroupService (format complexe)
   */

  /**
   * POST /campaign/:id/groups/reset
   * Réinitialiser les assignations de groupes
   */
  async resetAssignments({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      await this.groupService.resetGroupAssignments(campaignId)
      
      return response.ok({
        success: true,
        message: 'Group assignments reset successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to reset assignments',
        error: error.message,
      })
    }
  }
}