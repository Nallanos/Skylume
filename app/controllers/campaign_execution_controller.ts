import DmCampaign from '#models/dm_campaign'
import { HttpContext } from '@adonisjs/core/http'
import CampaignExecutionService from '#services/campaign_execution_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CampaignExecutionController {
    constructor(
        protected campaignExecutionService: CampaignExecutionService
    ) {}

    /**
     * Obtenir la configuration d'exécution d'une campagne
     */
    public async getExecutionConfig({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const config = await this.campaignExecutionService.getExecutionConfig(campaignId)
            
            return response.json(config)
        } catch (error) {
            console.error('Error getting execution config:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Sauvegarder la configuration d'exécution d'une campagne
     */
    public async saveExecutionConfig({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const config = request.all() as any // Type assertion pour éviter les erreurs de compilation

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            await this.campaignExecutionService.saveExecutionConfig(campaignId, config)
            
            return response.json({ success: true })
        } catch (error) {
            console.error('Error saving execution config:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Obtenir l'aperçu d'exécution d'une campagne
     */
    public async getExecutionPreview({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const preview = await this.campaignExecutionService.getExecutionPreview(campaignId)
            
            return response.json(preview)
        } catch (error) {
            console.error('Error getting execution preview:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Valider la configuration d'exécution d'une campagne
     */
    public async validateExecutionConfig({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const validation = await this.campaignExecutionService.validateExecutionConfig(campaignId)
            
            return response.json(validation)
        } catch (error) {
            console.error('Error validating execution config:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Réinitialiser les compteurs de messages envoyés
     */
    public async resetMessageCounts({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Réinitialiser les compteurs
            await this.campaignExecutionService.resetMessagesSentCounts(campaignId)
            
            return response.json({ success: true })
        } catch (error) {
            console.error('Error resetting message counts:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }
}
