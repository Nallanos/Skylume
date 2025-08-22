import type { HttpContext } from '@adonisjs/core/http'
import MessagePersonalizationService from '#services/message_personalization_service'
import FollowerCampaign from '#models/follower_campaign'

export default class CampaignPreviewsController {
  private messageService = new MessagePersonalizationService()

  /**
   * POST /campaign/:id/preview-message
   * Prévisualiser un message avec variables résolues
   */
  async previewMessage({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const { message, followerCampaignId } = request.only(['message', 'followerCampaignId'])
      
      let sampleFollower: FollowerCampaign | undefined
      
      if (followerCampaignId) {
        sampleFollower = await FollowerCampaign.find(followerCampaignId) || undefined
      }
      
      const preview = await this.messageService.previewMessage(
        campaignId,
        message,
        sampleFollower
      )
      
      return response.ok({
        success: true,
        data: preview,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to generate message preview',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/validate-messages
   * Valider tous les messages de tous les groupes
   */
  async validateAllMessages({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      const validation = await this.messageService.validateAllGroupMessages(campaignId)
      
      return response.ok({
        success: true,
        data: validation,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to validate messages',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/personalization-stats
   * Obtenir les statistiques de personnalisation
   */
  async getStats({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      const stats = await this.messageService.getPersonalizationStats(campaignId)
      
      return response.ok({
        success: true,
        data: stats,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to fetch personalization stats',
        error: error.message,
      })
    }
  }

  /**
   * GET /campaign/:id/sample-followers
   * Obtenir un échantillon de followers pour la prévisualisation
   */
  async getSampleFollowers({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const { limit = 10 } = request.qs()
      
      const followers = await FollowerCampaign.query()
        .where('dm_campaign_id', campaignId)
        .whereNotNull('followers_count')
        .orderBy('similarity_score', 'desc')
        .limit(parseInt(limit))
      
      return response.ok({
        success: true,
        data: followers,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to fetch sample followers',
        error: error.message,
      })
    }
  }
}