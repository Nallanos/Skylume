import type { HttpContext } from '@adonisjs/core/http'
import GroupService from '#services/group_service'
import CampaignGroup from '#models/campaign_group'
import { groupSimpleCreateValidator, groupSimpleUpdateValidator } from '#validators/campaign_group_simple_validator'

export default class CampaignGroupsController {
  private groupService = new GroupService()

  /**
   * GET /campaign/:id/groups
   * Récupérer tous les groupes d'une campagne avec estimations
   */
  async index({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      
      // Charger les groupes 
      const groups = await CampaignGroup.query()
        .where('campaign_id', campaignId)
        .orderBy('order', 'asc')
      
      const estimations = await this.groupService.calculateGroupEstimations(campaignId)
      
      // Enrichir les groupes avec les estimations
      const enrichedGroups = groups.map(group => {
        const estimation = estimations.find(e => e.groupId === group.id)
        const groupJson = group.toJSON()
        return {
          ...groupJson,
          priority: groupJson.order, // Alias pour la compatibilité frontend
          estimated_targets: estimation?.estimatedCount || 0, // ✅ Nom correct pour le frontend
          target_count: groupJson.targetCount || 0, // ✅ Map targetCount to target_count for frontend
          // ✅ S'assurer que explicit_links est inclus et correctement parsé
          explicit_links: groupJson.explicitLinks || [],
        }
      })
      
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
   * Obtenir les estimations de taille pour tous les groupes
   */
  async estimations({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      const estimations = await this.groupService.calculateGroupEstimations(campaignId)
      
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
      
      if (!conditions || !conditions.field || !conditions.operator || !conditions.value) {
        return response.badRequest({
          success: false,
          message: 'Missing required conditions (field, operator, value)',
        })
      }
      
      const estimatedTargets = await this.groupService.estimateTargetsForConditions(campaignId, conditions)
      
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