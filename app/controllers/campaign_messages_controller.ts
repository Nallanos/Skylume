import { HttpContext } from '@adonisjs/core/http'
import CampaignMessageService from '#services/campaign_message_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CampaignMessagesController {
    constructor(
        protected campaignMessageService: CampaignMessageService
    ) {}

    /**
     * Obtenir tous les messages d'une campagne
     */
    public async getCampaignMessages({ params, response }: HttpContext) {
        try {
            const campaignId = params.id
            const messages = await this.campaignMessageService.getCampaignMessages(campaignId)
            
            return response.json({
                success: true,
                messages
            })
        } catch (error) {
            console.error('Error fetching campaign messages:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Créer un nouveau message pour une campagne
     */
    public async createCampaignMessage({ params, request, response }: HttpContext) {
        try {
            const campaignId = params.id
            const { interestLevel, message } = request.only(['interestLevel', 'message'])

            if (!interestLevel || !message) {
                return response.status(400).json({
                    success: false,
                    error: 'Interest level and message are required'
                })
            }

            const campaignMessage = await this.campaignMessageService.createMessage({
                dmCampaignId: campaignId,
                interestLevel,
                message
                // Note: subject field removed as it doesn't exist in the interface
            })

            return response.json({
                success: true,
                message: campaignMessage
            })
        } catch (error) {
            console.error('Error creating campaign message:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Mettre à jour un message de campagne
     */
    public async updateCampaignMessage({ params, request, response }: HttpContext) {
        try {
            const messageId = params.messageId
            const data = request.only(['message', 'subject', 'isActive'])

            await this.campaignMessageService.updateMessage(messageId, data)

            return response.json({
                success: true,
                message: 'Campaign message updated successfully'
            })
        } catch (error) {
            console.error('Error updating campaign message:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Supprimer un message de campagne
     */
    public async deleteCampaignMessage({ params, response }: HttpContext) {
        try {
            const messageId = params.messageId
            await this.campaignMessageService.deleteMessage(messageId)

            return response.json({
                success: true,
                message: 'Campaign message deleted successfully'
            })
        } catch (error) {
            console.error('Error deleting campaign message:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }
}
