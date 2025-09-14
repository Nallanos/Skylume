import DmCampaign from '#models/dm_campaign'
import { HttpContext } from '@adonisjs/core/http'
import { formatKeywordsForStorage } from '../../utils/keywords.js'
import { inject } from '@adonisjs/core'
import CampaignMessageService from '#services/campaign_message_service'

@inject()
export default class DmCampaignsBasicController {
    constructor(
        protected campaignMessageService: CampaignMessageService
    ) {}

    /**
     * Créer une nouvelle campagne DM
     */
    public async createDmCampaign({ request, response, auth, session }: HttpContext) {
        try {
            const { name, accountHandle, strategy, keywords, excludeKeywords, interestedThreshold, moderatelyInterestedThreshold, message, explicitLinks } = request.only([
                "name", "accountHandle", "strategy", "keywords", "excludeKeywords", "interestedThreshold", "moderatelyInterestedThreshold", "message", "explicitLinks"
            ])
            const user = auth.getUserOrFail()

            // Validation des données requises
            if (!name || !accountHandle || !keywords || keywords.length === 0) {
                throw new Error("Name, account handle and keywords are required")
            }

            // Ensure keywords is properly formatted as JSON array
            const processedKeywords = formatKeywordsForStorage(keywords)
            const processedExcludeKeywords = excludeKeywords && excludeKeywords.length > 0 
                ? formatKeywordsForStorage(excludeKeywords) 
                : null

            // ✅ NOUVEAU: Traiter les liens explicites pour rich text
            const processedExplicitLinks = explicitLinks && explicitLinks.length > 0
                ? JSON.stringify(explicitLinks)
                : null

            const campaign = await DmCampaign.create({
                name,
                strategy: strategy || 'semantic_analysis',
                accountHandle,
                user_id: user.id,
                keywords: processedKeywords,
                excludeKeywords: processedExcludeKeywords,
                targetCount: 0, // Désormais géré par les groupes individuels
                interestedThreshold: interestedThreshold || 0.49,
                moderatelyInterestedThreshold: moderatelyInterestedThreshold || 0.35,
                analysisStatus: 'pending',
                checkConversationsStatus: 'pending',
                messageFacets: processedExplicitLinks
            })

            // Créer les messages par défaut pour la campagne
            await this.campaignMessageService.createDefaultMessages(
                campaign.id, 
                message, 
                processedExplicitLinks || undefined
            )

            session.flash("success", "Campaign created successfully!")
            return response.redirect("/campaign")
        } catch (err) {
            session.flash("error.badRequest", err.message)
            console.error(err)
            return response.redirect().back()
        }
    }

    /**
     * Activer/désactiver le statut d'une campagne
     */
    public async toggleDmCampaignStatus({ request, response, params }: HttpContext) {
        try {
            const campaignId = params.campaign_id || request.input('campaign_id')
            const campaign = await DmCampaign.findOrFail(campaignId)
            
            // ✅ FIX: Prevent toggle during active execution to avoid race conditions
            if (campaign.executionStatus === 'running') {
                console.log(`⚠️ Cannot toggle campaign ${campaignId} status: execution is currently running`)
                return response.status(400).json({ 
                    error: 'Cannot toggle campaign status while execution is running. Please pause or stop the execution first.' 
                })
            }
            
            console.log(`🔄 Toggling campaign ${campaignId} status from ${campaign.status} to ${!campaign.status}`)
            campaign.status = !campaign.status
            await campaign.save()
            
            console.log(`✅ Campaign ${campaignId} status toggled successfully to ${campaign.status}`)
            return response.json({ success: true, status: campaign.status })
        } catch (error) {
            console.error(`❌ Error toggling campaign status:`, error)
            return response.status(404).json({ error: error.message })
        }
    }

    /**
     * Supprimer une campagne DM
     */
    public async removeDmCampaign({ request, response, params }: HttpContext) {
        try {
            const campaignId = params.campaign_id || request.input('campaign_id')
            const campaign = await DmCampaign.findOrFail(campaignId)
            await campaign.delete()
            
            // Retourner JSON pour les requêtes AJAX
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.json({ success: true })
            }
            
            // Redirection pour les requêtes normales
            return response.redirect().back()
        } catch (error) {
            console.error(error)
            
            // Retourner JSON pour les requêtes AJAX
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.status(404).json({ error: error.message })
            }
            
            return response.status(404).json({ error: error.message })
        }
    }

    /**
     * Mettre à jour une campagne DM
     */
    public async updateCampaign({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const { name, keywords, excludeKeywords, interestedThreshold, moderatelyInterestedThreshold } = request.only([
                'name', 'keywords', 'excludeKeywords', 'interestedThreshold', 'moderatelyInterestedThreshold'
            ])

            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Ne pas permettre la modification si l'analyse est en cours
            if (campaign.analysisStatus === 'in_progress') {
                return response.status(400).json({ 
                    error: 'Cannot update campaign while analysis is in progress' 
                })
            }

            // Valider les données
            if (!name) {
                return response.status(400).json({ 
                    error: 'Campaign name is required' 
                })
            }

            // Mettre à jour la campagne
            campaign.name = name
            campaign.keywords = keywords || '[]'
            campaign.excludeKeywords = excludeKeywords || null
            
            // Mettre à jour les seuils si fournis
            if (interestedThreshold !== undefined) {
                campaign.interestedThreshold = interestedThreshold
            }
            if (moderatelyInterestedThreshold !== undefined) {
                campaign.moderatelyInterestedThreshold = moderatelyInterestedThreshold
            }

            await campaign.save()

            return response.json({ 
                success: true, 
                message: 'Campaign updated successfully',
                campaign: campaign.toJSON()
            })

        } catch (error) {
            console.error('Error updating campaign:', error)
            return response.status(500).json({ error: error.message })
        }
    }
}
