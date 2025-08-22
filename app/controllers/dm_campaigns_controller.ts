import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import CampaignVariable from '#models/campaign_variable'
import CampaignGroup from '#models/campaign_group'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Account from '#models/account'
import AccountService from '#services/account_service'
import AccountManager from '#services/account_manager'
import DmCampaignAnalysisService from '#services/dm_campaign_analysis_service'
import CampaignMessageService from '#services/campaign_message_service'
import ConversationTrackingService from '#services/conversation_tracking_service'
import CampaignExecutionService from '#services/campaign_execution_service'
import { formatKeywordsForStorage } from '../utils/keywords.js'
import { inject } from '@adonisjs/core'

@inject()
export default class DmCampaignsController {
    // Variables d'état pour le traitement en cours
    private accountService: AccountService | undefined
    private currentAccount!: Account
    private currentDmCampaign!: DmCampaign

    constructor(
        protected accountManager: AccountManager, 
        protected analysisService: DmCampaignAnalysisService,
        protected campaignMessageService: CampaignMessageService,
        protected conversationTrackingService: ConversationTrackingService,
        protected campaignExecutionService: CampaignExecutionService
    ) {}

    public async createDmCampaign({ request, response, auth, session }: HttpContext) {
        try {
            const { name, accountHandle, strategy, keywords, excludeKeywords, targetCount, interestedThreshold, moderatelyInterestedThreshold, message, explicitLinks } = request.only([
                "name", "accountHandle", "strategy", "keywords", "excludeKeywords", "targetCount", "interestedThreshold", "moderatelyInterestedThreshold", "message", "explicitLinks"
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
                targetCount: targetCount || 50,
                interestedThreshold: interestedThreshold || 0.7,
                moderatelyInterestedThreshold: moderatelyInterestedThreshold || 0.5,
                analysisStatus: 'pending',
                checkConversationsStatus: 'pending',
                messageFacets: processedExplicitLinks // ✅ NOUVEAU: Stocker les liens explicites
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

    public async toggleDmCampaignStatus({ request, response, params }: HttpContext) {
        try {
            const campaignId = params.campaign_id || request.input('campaign_id')
            const campaign = await DmCampaign.findOrFail(campaignId)
            campaign.status = !campaign.status
            await campaign.save()
            return response.json({ success: true, status: campaign.status })
        } catch (error) {
            console.error(error)
            return response.status(404).json({ error: error.message })
        }
    }

    public async removeDmCampaign({ request, response, params }: HttpContext) {
        try {
            const campaignId = params.campaign_id || request.input('campaign_id')
            const campaign = await DmCampaign.findOrFail(campaignId)
            await campaign.delete()
            
            // Retourner JSON pour les requêtes AJAX
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.json({ success: true, message: 'Campaign deleted successfully' })
            }
            
            // Redirection pour les requêtes normales
            return response.redirect().back()
        } catch (error) {
            console.error(error)
            
            // Retourner JSON pour les requêtes AJAX
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.status(500).json({ error: error.message || 'Failed to delete campaign' })
            }
            
            return response.status(404).json({ error: error.message })
        }
    }

    private async initializeCampaignContext(campaignId: string) {
        this.currentDmCampaign = await DmCampaign.findOrFail(campaignId)

        const account_handle = this.currentDmCampaign.accountHandle
        this.currentAccount = await Account.findByOrFail("handle", account_handle)

        // Obtenir le AccountService via AccountManager
        this.accountService = await this.accountManager.getOrCreateAccountService(this.currentAccount)
        if (!this.accountService) {
            throw new Error("Account service not found")
        }

        await this.refreshAuthTokens()
    }

    /**
     * Vérifier si les conditions d'un groupe correspondent à un follower
     */
    private checkGroupConditions(conditions: Record<string, any>, followerCampaign: FollowerCampaign): boolean {
        if (!conditions) return false

        // Si les conditions sont dans le format simple {field, operator, value}
        if (conditions.field && conditions.operator && conditions.value !== undefined) {
            return this.evaluateCondition(conditions, followerCampaign)
        }

        // Si les conditions sont dans un format plus complexe, itérer
        for (const [, condition] of Object.entries(conditions)) {
            if (typeof condition === 'object' && condition.field) {
                if (this.evaluateCondition(condition, followerCampaign)) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * Évaluer une condition individuelle
     */
    private evaluateCondition(condition: any, followerCampaign: FollowerCampaign): boolean {
        const { field, operator, value } = condition

        console.log(`🔍 Evaluating condition:`, { field, operator, value, followerHandle: followerCampaign.followerHandle })

        if (field === 'followers_count') {
            const followerCount = followerCampaign.followersCount || 0
            const targetValue = parseInt(value)

            console.log(`📊 Comparing: ${followerCount} ${operator} ${targetValue}`)

            let result = false
            switch (operator) {
                case 'gte': 
                    result = followerCount >= targetValue
                    break
                case 'lte': 
                    result = followerCount <= targetValue
                    break
                case 'gt': 
                    result = followerCount > targetValue
                    break
                case 'lt': 
                    result = followerCount < targetValue
                    break
                case 'eq': 
                    result = followerCount === targetValue
                    break
                default: 
                    console.warn(`Unknown operator: ${operator}`)
                    result = false
            }

            console.log(`📋 Condition result: ${result}`)
            return result
        }

        console.warn(`Unknown field: ${field}`)
        return false
    }

    private async refreshAuthTokens() {
        if (!this.accountService) throw new Error("Account service not found")
        // Ne resume la session que si elle est absente ou expirée
        if (!this.currentAccount.at_session || this.isJwtExpired(this.currentAccount.at_session.accessJwt)) {
            await this.accountService.createOrResumeSession(this.currentAccount)
            await this.currentAccount.refresh()
        }

        if (!this.currentAccount.at_session) {
            throw new Error("Account session missing")
        }

        // Note: authTokens property removed as it's no longer needed
        console.warn("Session refreshed")
    }

    private async withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
        try {
            return await fn()
        } catch (err) {
            if (err.message.includes('JwtExpired')) {
                console.log(`JWT expiré (${context}), rafraîchissement...`)
                await this.refreshAuthTokens()
                return await fn()
            }
            throw err
        }
    }

    private isJwtExpired(token?: string): boolean {
        if (!token) return true
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
            return payload.exp * 1000 < Date.now() + 5000
        } catch {
            return true
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Mettre à jour une campagne DM
     */
    public async updateCampaign({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const { name, targetCount, keywords, excludeKeywords, interestedThreshold, moderatelyInterestedThreshold } = request.only([
                'name', 'targetCount', 'keywords', 'excludeKeywords', 'interestedThreshold', 'moderatelyInterestedThreshold'
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
                    error: 'Name is required' 
                })
            }

            // Mettre à jour la campagne
            campaign.name = name
            // campaign.message removed - now handled by campaign messages
            campaign.targetCount = targetCount || campaign.targetCount
            campaign.keywords = keywords || '[]'
            campaign.excludeKeywords = excludeKeywords || null
            
            // Mettre à jour les seuils si fournis
            if (interestedThreshold !== undefined) {
                campaign.interestedThreshold = parseFloat(interestedThreshold)
            }
            if (moderatelyInterestedThreshold !== undefined) {
                campaign.moderatelyInterestedThreshold = parseFloat(moderatelyInterestedThreshold)
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
    public async analyzeFollowers({ params, response, auth, session, request }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Vérifier que l'analyse n'est pas déjà en cours
            if (campaign.analysisStatus === 'in_progress') {
                session.flash('error', 'Analysis is already in progress')
                return response.redirect().back()
            }

            // Démarrer l'analyse en arrière-plan
            this.analysisService.analyzeAccountFollowers(campaign)
                .catch(error => {
                    console.error('Background analysis failed:', error)
                })

            // Check if this is an AJAX request
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.json({ 
                    success: true, 
                    message: 'Analysis started',
                    campaignId: campaign.id,
                    status: 'in_progress'
                })
            }

            // Flash success message and redirect back
            session.flash('success', 'Analysis started successfully!')
            return response.redirect().back()

        } catch (error) {
            console.error('Error starting analysis:', error)
            
            // Check if this is an AJAX request
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.status(500).json({ error: error.message })
            }
            
            session.flash('error', `Error starting analysis: ${error.message}`)
            return response.redirect().back()
        }
    }

    /**
     * Démarrer l'exécution d'une campagne avec un nombre de cibles
     */
    public async executeCampaign({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const { targetCount } = request.only(['targetCount'])
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Vérifier que l'analyse est terminée
            if (campaign.analysisStatus !== 'completed') {
                return response.status(400).json({ 
                    error: 'Campaign analysis must be completed before execution' 
                })
            }

            // Validation du targetCount
            const finalTargetCount = targetCount || campaign.targetCount || 0
            if (finalTargetCount <= 0) {
                return response.status(400).json({ 
                    error: 'Target count must be greater than 0' 
                })
            }

            // Mettre à jour le nombre de cibles
            campaign.targetCount = finalTargetCount
            campaign.executionStartedAt = DateTime.now()
            await campaign.save()

            // Sélectionner les followers à cibler
            const targetFollowers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .where('message_sent', false)
                .whereIn('interest_level', ['interested', 'moderately_interested'])
                .orderByRaw(`
                    CASE interest_level 
                        WHEN 'interested' THEN 1 
                        WHEN 'moderately_interested' THEN 2 
                        ELSE 3 
                    END
                `)
                .orderByRaw('RANDOM()')
                .limit(finalTargetCount)

            console.log(`📋 Found ${targetFollowers.length} target followers (requested: ${finalTargetCount})`)
            targetFollowers.forEach(follower => {
                console.log(`👤 @${follower.followerHandle} - ${follower.followersCount || 0} followers - Interest: ${follower.interestLevel}`)
            })

            // Initialiser le contexte de campagne pour l'exécution
            await this.initializeCampaignContext(campaignId.toString())

            // Traiter par groupe au lieu de follower par follower
            let messagesSent = 0
            messagesSent = await this.executeByGroups(campaign, targetFollowers, finalTargetCount)

            // Mettre à jour les statistiques de la campagne
            campaign.number_of_message_sent += messagesSent
            campaign.executionCompletedAt = DateTime.now()
            await campaign.save()

            console.log(`Campaign execution completed: ${messagesSent} messages sent`)

            return response.json({ 
                success: true,
                messagesSent,
                totalTargeted: targetFollowers.length
            })

        } catch (error) {
            console.error('Error executing campaign:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Exécuter la campagne en traitant par groupe
     */
    private async executeByGroups(campaign: DmCampaign, targetFollowers: FollowerCampaign[], finalTargetCount: number): Promise<number> {
        let totalMessagesSent = 0

        try {
            // Charger tous les groupes de la campagne avec leurs messages
            await campaign.load('groups', (groupQuery) => {
                groupQuery.preload('groupMessages')
            })

            console.log(`📊 Found ${campaign.groups.length} groups for campaign execution`)

            if (campaign.groups.length === 0) {
                throw new Error('No campaign groups found. Please create groups with messages first.')
            }

            // Traiter chaque groupe
            for (const group of campaign.groups) {
                console.log(`\n🔄 Processing group: "${group.name}"`)
                console.log(`📋 Group conditions:`, group.conditions)

                // Trouver les followers qui correspondent aux conditions de ce groupe
                const matchingFollowers = this.filterFollowersByGroup(targetFollowers, group)
                console.log(`👥 Found ${matchingFollowers.length} followers matching group conditions`)

                if (matchingFollowers.length === 0) {
                    console.log(`⏭️ Skipping group "${group.name}" - no matching followers`)
                    continue
                }

                // Récupérer le message pour ce groupe
                const message = this.getGroupMessage(group)
                if (!message) {
                    console.warn(`⚠️ No message found for group "${group.name}" - skipping`)
                    continue
                }

                console.log(`📝 Using message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`)

                // Envoyer le message à tous les followers de ce groupe
                let groupMessagesSent = 0
                for (const followerCampaign of matchingFollowers) {
                    if (totalMessagesSent >= finalTargetCount) {
                        console.log(`🎯 Target count (${finalTargetCount}) reached, stopping execution`)
                        break
                    }

                    try {
                        await this.sendMessageToSpecificFollower(followerCampaign, message, group)
                        
                        followerCampaign.messageSent = true
                        followerCampaign.messageSentAt = DateTime.now()
                        await followerCampaign.save()
                        
                        groupMessagesSent++
                        totalMessagesSent++
                        console.log(`✅ Message sent to ${followerCampaign.followerHandle} (${totalMessagesSent}/${finalTargetCount})`)
                        
                    } catch (error) {
                        console.error(`❌ Failed to send message to ${followerCampaign.followerHandle}:`, error)
                    }
                }

                console.log(`📊 Group "${group.name}" completed: ${groupMessagesSent} messages sent`)

                if (totalMessagesSent >= finalTargetCount) {
                    break
                }
            }

            return totalMessagesSent

        } catch (error) {
            console.error('❌ Error in executeByGroups:', error)
            throw error
        }
    }

    /**
     * Filtrer les followers qui correspondent aux conditions d'un groupe
     */
    private filterFollowersByGroup(followers: FollowerCampaign[], group: CampaignGroup): FollowerCampaign[] {
        const conditions = group.conditions
        if (!conditions) {
            console.warn(`Group "${group.name}" has no conditions, including all followers`)
            return followers
        }

        console.log(`🔍 Filtering ${followers.length} followers for group "${group.name}"`)
        
        const matchingFollowers = followers.filter(async (follower) => {
            if (follower.followersCount === 0 && this.accountService) {
                try {
                    const profile = await this.accountService.getProfile(follower.followerHandle!)
                    follower.followersCount = profile?.followersCount || 0
                    await follower.save()
                    console.log(`✅ Follower count updated for @${follower.followerHandle}: ${follower.followersCount}`)
                } catch (error) {
                    console.warn(`⚠️ Failed to fetch follower count for @${follower.followerHandle}:`, error.message)
                }
            }
            console.log(`📊 Follower @${follower.followerHandle} (${follower.followersCount || 0} followers)`)
            const matches = this.checkGroupConditions(conditions, follower)
            return matches
        })

        console.log(`🎯 Result: ${matchingFollowers.length}/${followers.length} followers match conditions`)
        return matchingFollowers
    }

    /**
     * Récupérer le message d'un groupe
     */
    private getGroupMessage(group: CampaignGroup): string | null {
        // Priorité 1: Message simple du groupe
        if (group.message && group.message.trim()) {
            return group.message
        }

        // Priorité 2: Premier message des templates
        if (group.groupMessages && group.groupMessages.length > 0) {
            return group.groupMessages[0].messageContent
        }

        return null
    }

    /**
     * Envoyer un message spécifique à un follower
     */
    private async sendMessageToSpecificFollower(followerCampaign: FollowerCampaign, message: string, group?: CampaignGroup) {
        try {
            console.log(`📤 Sending message to @${followerCampaign.followerHandle}`)
            console.log(`📝 Original message: "${message}"`)
            console.log(`🏷️ Group: ${group?.name || 'No group'}`)
            
            // Traiter le message avec les variables et les liens
            const messageResult = await this.processMessageForFollower(message, followerCampaign, group)
            
            console.log(`✅ Processed message: "${messageResult.text}"`)
            console.log(`🔗 Rich text facets: ${messageResult.facets?.length || 0}`)

            // Récupérer la conversation avec ce follower
            const convo = await this.withRetry(
                () => {
                    if (!this.accountService) {
                        throw new Error('Account Service not defined')
                    }
                    return this.accountService.getConvoFromMembers(
                        this.currentAccount, 
                        [this.currentAccount.at_session!.did, followerCampaign.followerDid]
                    )
                },
                'getConvoFromMembers'
            )

            if (convo) {
                console.log(`💬 Sending to conversation: ${convo.id}`)
                
                // Utiliser les facets AT Protocol si disponibles
                const messagePayload: any = {
                    convoId: convo.id, 
                    message: { 
                        text: messageResult.text
                    }
                }

                // Ajouter les facets pour les liens rich text si présents
                if (messageResult.facets && messageResult.facets.length > 0) {
                    messagePayload.message.facets = messageResult.facets
                    console.log(`🔗 Adding ${messageResult.facets.length} rich text facets to message`)
                }

                await this.withRetry(
                    () => {
                        if (!this.accountService) {
                            throw new Error('Account Service not defined')
                        }
                        return this.accountService.sendMessageToConvo(
                            this.currentAccount,
                            messagePayload
                        )
                    },
                    'sendMessageToConvo'
                )
                console.log(`✅ Message sent successfully to @${followerCampaign.followerHandle}`)
            } else {
                console.error(`❌ No conversation found with @${followerCampaign.followerHandle}`)
            }
        } catch (error) {
            console.error(`❌ Error sending message to @${followerCampaign.followerHandle}:`, error)
            throw error
        }
    }

    /**
     * Traiter un message pour un follower : remplacer les variables et appliquer les liens
     */
    private async processMessageForFollower(message: string, followerCampaign: FollowerCampaign, group?: CampaignGroup): Promise<{ text: string, facets?: any[] }> {
        let processedMessage = message
        let facets: any[] | undefined

        try {
            // 1. Remplacer les variables avec les données du follower
            processedMessage = await this.replaceVariablesInMessage(processedMessage, followerCampaign)

            // 2. Appliquer les liens explicites du groupe si disponibles
            if (group && group.explicitLinks) {
                const result = this.applyExplicitLinks(processedMessage, group.explicitLinks)
                processedMessage = result.text
                facets = result.facets
            }

            console.log(`📝 Original message: "${message}"`)
            console.log(`🔄 Processed message: "${processedMessage}"`)
            console.log(`🔗 Facets generated: ${facets?.length || 0}`)

            return { text: processedMessage, facets }

        } catch (error) {
            console.error('Error processing message:', error)
            return { text: message } // Retourner le message original en cas d'erreur
        }
    }

    /**
     * Remplacer les variables dans un message
     */
    private async replaceVariablesInMessage(message: string, followerCampaign: FollowerCampaign): Promise<string> {
        let processedMessage = message
        
        console.log(`🔄 Processing variables for message: "${message}"`)
        console.log(`👤 Follower: @${followerCampaign.followerHandle} (${followerCampaign.followersCount || 0} followers)`)

        // Récupérer les variables de la campagne
        const campaign = await DmCampaign.find(followerCampaign.dmCampaignId)
        if (!campaign) {
            console.log(`❌ Campaign not found for ID: ${followerCampaign.dmCampaignId}`)
            return message
        }

        await campaign.load('variables')
        console.log(`📋 Found ${campaign.variables.length} variables in campaign`)
        
        if (campaign.variables.length === 0) {
            console.log(`⚠️ No variables found for campaign ${campaign.id}. Variables in DB:`)
            // Let's check if there are any variables at all
            const allVariables = await this.checkCampaignVariables(campaign.id)
            console.log(`🔍 Direct query found ${allVariables.length} variables`)
        }
        
        // Remplacer chaque variable trouvée dans le message
        for (const variable of campaign.variables) {
            const variablePattern = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g')
            const variableValue = await this.getVariableValue(variable, followerCampaign)
            const oldMessage = processedMessage
            processedMessage = processedMessage.replace(variablePattern, variableValue)
            
            console.log(`🔧 Variable "${variable.name}": "${variableValue}" (type: ${variable.type})`)
            if (oldMessage !== processedMessage) {
                console.log(`✅ Replaced "{{${variable.name}}}" with "${variableValue}"`)
            } else {
                console.log(`⚠️ Variable "{{${variable.name}}}" not found in message`)
            }
        }

        console.log(`🏁 Final processed message: "${processedMessage}"`)
        return processedMessage
    }

    /**
     * Helper method to check campaign variables directly
     */
    private async checkCampaignVariables(campaignId: number) {
        const { default: CampaignVariable } = await import('#models/campaign_variable')
        return await CampaignVariable.query().where('campaign_id', campaignId)
    }

    /**
     * Obtenir la valeur d'une variable pour un follower
     */
    private async getVariableValue(variable: any, followerCampaign: FollowerCampaign): Promise<string> {
        switch (variable.type) {
            case 'follower_count':
                // Fix: Fetch real follower count from Bluesky if missing or 0
                let count = followerCampaign.followersCount || 0
                
                if (count === 0 && this.accountService) {
                    try {
                        console.log(`🔍 Fetching real follower count for @${followerCampaign.followerHandle} from Bluesky...`)
                        
                        // Fetch profile directly using the follower's handle or DID
                        const profile = await this.accountService.getProfile(followerCampaign.followerHandle || followerCampaign.followerDid)
                        
                        if (profile && profile.followersCount) {
                            count = profile.followersCount
                            
                            // Update the followerCampaign record with the real count
                            followerCampaign.followersCount = count
                            await followerCampaign.save()
                            
                            console.log(`✅ Updated follower count for @${followerCampaign.followerHandle}: ${count}`)
                        }
                    } catch (error) {
                        console.warn(`⚠️ Failed to fetch follower count for @${followerCampaign.followerHandle}:`, error.message)
                    }
                }
                
                console.log(`📊 Follower count for @${followerCampaign.followerHandle}: ${count}`)
                console.log(`🔧 Variable "${variable.name}" configuration:`, variable.configuration)
                
                if (count >= 1000) {
                    // Check if the variable configuration specifies "round to thousands"
                    const config = variable.configuration || {}
                    
                    if (config.rounding === 'thousands') {
                        // Round to nearest thousand first, then convert to k
                        const roundedThousands = Math.round(count / 1000)
                        console.log(`📊 Rounded ${count} to ${roundedThousands}k (round to thousands)`)
                        return roundedThousands + 'k'
                    } else {
                        // Default: show with one decimal place
                        console.log(`📊 Formatted ${count} to ${(count / 1000).toFixed(1)}k (decimal format)`)
                        return (count / 1000).toFixed(1) + 'k'
                    }
                }
                return count.toString()
            
            case 'display_name':
                return followerCampaign.followerHandle || 'Friend'
            
            case 'handle':
                return `@${followerCampaign.followerHandle}`
            
            default:
                console.log(`⚠️ Unknown variable type: ${variable.type}, using default value`)
                return variable.defaultValue || `{{${variable.name}}}`
        }
    }

    /**
     * Appliquer les liens explicites à un message en utilisant les facets AT Protocol
     */
    private applyExplicitLinks(message: string, explicitLinks: any): { text: string, facets?: any[] } {
        let processedMessage = message
        let facets: any[] = []

        // Validation et conversion en array si nécessaire
        let linksArray: Array<{text: string, url: string}> = []
        
        if (!explicitLinks) {
            console.log(`🔗 No explicit links to process`)
            return { text: message }
        }

        // Si c'est une string JSON, la parser
        if (typeof explicitLinks === 'string') {
            try {
                linksArray = JSON.parse(explicitLinks)
            } catch (error) {
                console.error(`🔗 Error parsing explicitLinks JSON:`, error)
                return { text: message }
            }
        } else if (Array.isArray(explicitLinks)) {
            linksArray = explicitLinks
        } else {
            console.error(`🔗 explicitLinks is not an array or JSON string, type:`, typeof explicitLinks, 'value:', explicitLinks)
            return { text: message }
        }

        if (!Array.isArray(linksArray) || linksArray.length === 0) {
            console.log(`🔗 No valid explicit links found`)
            return { text: message }
        }

        console.log(`🔗 Processing ${linksArray.length} explicit links with AT Protocol facets`)

        // Traiter chaque lien et créer les facets correspondants
        linksArray.forEach((link, index) => {
            if (link && link.text && link.url) {
                // Trouver la position du texte du lien dans le message
                const linkTextIndex = processedMessage.indexOf(link.text)
                
                if (linkTextIndex !== -1) {
                    // Créer un facet AT Protocol pour ce lien
                    const facet = {
                        index: {
                            byteStart: new TextEncoder().encode(processedMessage.substring(0, linkTextIndex)).length,
                            byteEnd: new TextEncoder().encode(processedMessage.substring(0, linkTextIndex + link.text.length)).length
                        },
                        features: [{
                            $type: 'app.bsky.richtext.facet#link',
                            uri: link.url
                        }]
                    }
                    
                    facets.push(facet)
                    console.log(`🔗 Created AT Protocol facet for "${link.text}" -> "${link.url}"`)
                } else {
                    console.warn(`🔗 Link text "${link.text}" not found in message`)
                }
            } else {
                console.warn(`🔗 Invalid link at index ${index}:`, link)
            }
        })

        console.log(`🏁 Final message with ${facets.length} facets for AT Protocol`)
        
        return {
            text: processedMessage,
            facets: facets.length > 0 ? facets : undefined
        }
    }

    /**
     * Obtenir les statistiques d'une campagne
     */
    public async getCampaignStats({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const stats = await this.calculateCampaignStats(campaign)
            return response.json(stats)

        } catch (error) {
            console.error('Error getting campaign stats:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Page du dashboard d'une campagne (pour Inertia)
     */
    public async getCampaignDashboardPage({ params, inertia, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Récupérer la campagne et vérifier l'accès
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Récupérer les variables de la campagne
            const variables = await CampaignVariable.query()
                .where('campaign_id', campaignId)
                .orderBy('created_at', 'asc')

            // Récupérer les groupes de la campagne
            const groups = await CampaignGroup.query()
                .where('campaign_id', campaignId)
                .orderBy('order', 'asc')

            // Calculer les statistiques
            const stats = await this.calculateCampaignStats(campaign)

            // Récupérer quelques followers pour l'affichage (limité pour performance)
            const followers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .orderBy('similarity_score', 'desc')
                .limit(100)

            // Enrichir l'objet campaign avec les variables et groupes
            const enrichedCampaign = {
                ...campaign.toJSON(),
                variables: variables.map((v: any) => v.toJSON()),
                groups: groups.map((g: any) => {
                    const groupJson = g.toJSON()
                    return {
                        ...groupJson,
                        priority: groupJson.order, // Alias pour la compatibilité frontend
                    }
                })
            }

            return inertia.render('CampaignDashboard', {
                user: user.toJSON(),
                campaign: enrichedCampaign,
                stats,
                followers: followers.map((f) => {
                    try {
                        return f.toJSON()
                    } catch (error) {
                        console.error('Error serializing follower:', error, 'Follower ID:', f.id)
                        // Return a safe version without the problematic field
                        return {
                            id: f.id,
                            followerHandle: f.followerHandle,
                            followerBio: f.followerBio,
                            similarityScore: f.similarityScore,
                            messageSent: f.messageSent,
                            responseReceived: f.responseReceived,
                            alreadyContacted: f.alreadyContacted,
                            messageSentAt: f.messageSentAt?.toISO?.() || null,
                            responseReceivedAt: f.responseReceivedAt?.toISO?.() || null,
                        }
                    }
                })
            })
        } catch (error) {
            console.error('Error loading campaign dashboard page:', error)
            return inertia.render('CampaignDashboard', {
                user: auth.user?.toJSON() || {},
                campaign: null,
                stats: null,
                followers: [],
                error: 'Failed to load campaign dashboard'
            })
        }
    }

    /**
     * Page des statistiques d'une campagne (pour Inertia)
     */
    public async getCampaignStatsPage({ params, inertia, auth, request }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Récupérer la campagne et vérifier l'accès
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Calculer les statistiques
            console.log('Calculating campaign stats for:', campaign)
            const stats = await this.calculateCampaignStats(campaign)
            console.log('Campaign Stats:', stats)
            // Paramètres de pagination et filtres depuis l'URL
            const page = Number(request.input('page', 1))
            const limit = Number(request.input('limit', 50))
            const filter = request.input('filter', 'all') // all, interested, moderately_interested, etc.
            const search = request.input('search', '')
            const sortBy = request.input('sort', 'similarity_desc')

            // Récupérer les followers avec pagination et filtres
            const followersData = await this.getAnalyzedFollowersPaginated(
                campaignId, 
                page, 
                limit, 
                filter, 
                search, 
                sortBy
            )

            return inertia.render('CampaignStats', {
                stats,
                followersData,
                error: null
            })
        } catch (error) {
            console.error('Error loading campaign stats page:', error)
            return inertia.render('CampaignStats', {
                stats: null,
                followersData: { followers: [], pagination: null, counts: {}, filters: { filter: 'all', search: '', sortBy: 'similarity_desc' } },
                error: 'Failed to load campaign statistics'
            })
        }
    }

    /**
     * Récupérer les followers analysés avec pagination et filtres optimisés
     */
    private async getAnalyzedFollowersPaginated(
        campaignId: number,
        page: number = 1,
        limit: number = 50,
        filter: string = 'all',
        search: string = '',
        sortBy: string = 'similarity_desc'
    ) {
        const offset = (page - 1) * limit

        // Construire la query de base
        let query = FollowerCampaign.query().where('dm_campaign_id', campaignId)

        // Appliquer les filtres
        if (filter !== 'all') {
            query = query.where('interest_level', filter)
        }

        if (search.trim()) {
            query = query.where((builder) => {
                builder
                    .whereILike('follower_handle', `%${search}%`)
                    .orWhereILike('follower_display_name', `%${search}%`)
                    .orWhereILike('follower_bio', `%${search}%`)
            })
        }

        // Appliquer le tri
        switch (sortBy) {
            case 'similarity_desc':
                query = query.orderBy('similarity_score', 'desc')
                break
            case 'similarity_asc':
                query = query.orderBy('similarity_score', 'asc')
                break
            case 'handle':
                query = query.orderBy('follower_handle', 'asc')
                break
            default:
                query = query.orderBy('id', 'asc')
        }

        // Exécuter la query avec pagination
        const followers = await query.offset(offset).limit(limit)

        // Compter le total pour la pagination
        let countQuery = FollowerCampaign.query().where('dm_campaign_id', campaignId)
        
        if (filter !== 'all') {
            countQuery = countQuery.where('interest_level', filter)
        }

        if (search.trim()) {
            countQuery = countQuery.where((builder) => {
                builder
                    .whereILike('follower_handle', `%${search}%`)
                    .orWhereILike('follower_display_name', `%${search}%`)
                    .orWhereILike('follower_bio', `%${search}%`)
            })
        }

        const totalCount = await countQuery.count('* as total')
        const total = Number(totalCount[0].$extras.total)

        // Calculer les compteurs par niveau d'intérêt pour les filtres
        const countsQuery = await FollowerCampaign.query()
            .where('dm_campaign_id', campaignId)
            .groupBy('interest_level')
            .select('interest_level')
            .count('* as count')

        const counts = countsQuery.reduce((acc, item: any) => {
            const interestLevel = item.$extras.interest_level || item.interest_level
            if (interestLevel) {
                acc[interestLevel] = Number(item.$extras.count)
            }
            return acc
        }, {} as Record<string, number>)

        // Ajouter le total
        counts.all = Object.values(counts).reduce((sum, count) => sum + count, 0)

        const pagination = {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
            perPage: limit
        }

        return {
            followers,
            pagination,
            counts,
            filters: { filter, search, sortBy }
        }
    }

    /**
     * Calculer les statistiques d'une campagne
     */
    private async calculateCampaignStats(campaign: DmCampaign) {
        console.log('=== DEBUG calculateCampaignStats ===')
        console.log('Campaign ID:', campaign.id)
        
        // Vérifier d'abord s'il y a des FollowerCampaign pour cette campagne
        const totalFollowers = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .count('* as total')
        
        console.log('Total FollowerCampaign records:', totalFollowers[0].$extras.total)
        
        // Si pas de données FollowerCampaign, utiliser les données de la campagne directement
        if (Number(totalFollowers[0].$extras.total) === 0) {
            console.log('No FollowerCampaign data found, using campaign data directly')
            const breakdown = {
                total: campaign.totalFollowersAnalyzed || 0,
                interested: campaign.interestedFollowers || 0,
                moderatelyInterested: campaign.moderatelyInterestedFollowers || 0,
                notInterested: campaign.notInterestedFollowers || 0,
                excluded: campaign.excludedFollowers || 0,
                cannotDetermine: campaign.cannotDetermineFollowers || 0,
                messagesSent: campaign.number_of_message_sent || 0,
                responsesReceived: 0
            }

            return {
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    analysisStatus: campaign.analysisStatus,
                    totalFollowersAnalyzed: campaign.totalFollowersAnalyzed || 0,
                    interestedFollowers: campaign.interestedFollowers || 0,
                    moderatelyInterestedFollowers: campaign.moderatelyInterestedFollowers || 0,
                    notInterestedFollowers: campaign.notInterestedFollowers || 0,
                    excludedFollowers: campaign.excludedFollowers || 0,
                    cannotDetermineFollowers: campaign.cannotDetermineFollowers || 0,
                    targetCount: campaign.targetCount,
                    messagesSent: campaign.number_of_message_sent || 0,
                    interestedThreshold: campaign.interestedThreshold,
                    moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold,
                    analysisStartedAt: campaign.analysisStartedAt?.toISO(),
                    analysisCompletedAt: campaign.analysisCompletedAt?.toISO(),
                    executionStartedAt: campaign.executionStartedAt?.toISO(),
                    executionCompletedAt: campaign.executionCompletedAt?.toISO()
                },
                breakdown
            }
        }

        // Calculer les compteurs depuis FollowerCampaign pour plus de précision
        const followerCounts = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .groupBy('interest_level')
            .select('interest_level')
            .count('* as count')

        console.log('FollowerCounts query result:', followerCounts)

        let interestedCount = 0
        let moderatelyInterestedCount = 0
        let notInterestedCount = 0
        let excludedCount = 0
        let cannotDetermineCount = 0

        followerCounts.forEach((item: any) => {
            const count = Number(item.$extras.count)
            const interestLevel = item.interestLevel || item.$extras.interest_level
            console.log(`Processing: ${interestLevel} = ${count}`)
            
            switch (interestLevel) {
                case 'interested':
                    interestedCount = count
                    break
                case 'moderately_interested':
                    moderatelyInterestedCount = count
                    break
                case 'not_interested':
                    notInterestedCount = count
                    break
                case 'excluded':
                    excludedCount = count
                    break
                case 'cannot_determine':
                    cannotDetermineCount = count
                    break
            }
        })

        // Calculer les messages envoyés depuis FollowerCampaign
        const messagesSentQuery = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .where('message_sent', true)
            .count('* as total')

        const messagesSentFromFollowers = Number(messagesSentQuery[0].$extras.total)

        // Calculer les réponses reçues
        const responsesReceived = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .where('response_received', true)
            .count('* as total')

        const breakdown = {
            total: campaign.totalFollowersAnalyzed || 0,
            interested: interestedCount,
            moderatelyInterested: moderatelyInterestedCount,
            notInterested: notInterestedCount,
            excluded: excludedCount,
            cannotDetermine: cannotDetermineCount,
            messagesSent: Math.max(campaign.number_of_message_sent || 0, messagesSentFromFollowers),
            responsesReceived: Number(responsesReceived[0].$extras.total)
        }

        console.log('Final breakdown:', breakdown)

        return {
            campaign: {
                id: campaign.id,
                name: campaign.name,
                analysisStatus: campaign.analysisStatus,
                totalFollowersAnalyzed: campaign.totalFollowersAnalyzed || 0,
                interestedFollowers: interestedCount,
                moderatelyInterestedFollowers: moderatelyInterestedCount,
                notInterestedFollowers: notInterestedCount,
                excludedFollowers: excludedCount,
                cannotDetermineFollowers: cannotDetermineCount,
                targetCount: campaign.targetCount,
                messagesSent: Math.max(campaign.number_of_message_sent || 0, messagesSentFromFollowers),
                interestedThreshold: campaign.interestedThreshold,
                moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold,
                analysisStartedAt: campaign.analysisStartedAt?.toISO(),
                analysisCompletedAt: campaign.analysisCompletedAt?.toISO(),
                executionStartedAt: campaign.executionStartedAt?.toISO(),
                executionCompletedAt: campaign.executionCompletedAt?.toISO()
            },
            breakdown
        }
    }    /**
     * Obtenir les followers analysés avec pagination et filtres
     */
    public async getAnalyzedFollowers({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const { 
                page = 1, 
                limit = 20, 
                interestLevel, 
                search 
            } = request.only(['page', 'limit', 'interestLevel', 'search'])
            
            console.log('getAnalyzedFollowers called with:', { campaignId, page, limit, interestLevel, search })
            
            // Vérifier que l'utilisateur possède cette campagne
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const query = FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)

            // Filtrer par niveau d'intérêt si spécifié
            if (interestLevel) {
                console.log('Filtering by interest level:', interestLevel)
                query.where('interest_level', interestLevel)
            }

            // Recherche par handle ou bio si spécifiée
            if (search) {
                query.where((builder) => {
                    builder
                        .whereILike('follower_handle', `%${search}%`)
                        .orWhereILike('follower_bio', `%${search}%`)
                })
            }

            const followers = await query
                .orderBy('similarity_score', 'desc')
                .paginate(page, limit)

            console.log('Found followers:', followers.all().length)

            // Safe serialization of followers
            const safeFollowers = {
                ...followers.toJSON(),
                data: followers.map(f => {
                    try {
                        return f.toJSON()
                    } catch (error) {
                        console.error('Error serializing follower in paginated results:', error, 'Follower ID:', f.id)
                        return {
                            id: f.id,
                            followerHandle: f.followerHandle,
                            followerBio: f.followerBio,
                            similarityScore: f.similarityScore,
                            messageSent: f.messageSent,
                            responseReceived: f.responseReceived,
                            interestLevel: f.interestLevel,
                            bioQuality: f.bioQuality,
                            alreadyContacted: f.alreadyContacted,
                            analysisMetadata: null
                        }
                    }
                })
            }

            return response.json({ followers: safeFollowers })

        } catch (error) {
            console.error('Error getting analyzed followers:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * API pour obtenir les followers analysés avec pagination et filtres
     */
    public async getAnalyzedFollowersPaginatedApi({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier l'accès à la campagne
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Paramètres de pagination et filtres
            const page = Number(request.input('page', 1))
            const limit = Number(request.input('limit', 50))
            const filter = request.input('filter', 'all')
            const search = request.input('search', '')
            const sortBy = request.input('sort', 'similarity_desc')

            // Récupérer les données paginées
            const followersData = await this.getAnalyzedFollowersPaginated(
                campaignId, 
                page, 
                limit, 
                filter, 
                search, 
                sortBy
            )

            return response.json(followersData)
        } catch (error) {
            console.error('Error fetching paginated followers:', error)
            return response.status(500).json({ 
                error: 'Failed to fetch followers data',
                followers: [],
                pagination: null,
                counts: {}
            })
        }
    }

    /**
     * Compter les réponses reçues pour une campagne
     */
    public async countResponses({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            // Vérifier que l'utilisateur possède cette campagne
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Initialiser le contexte de campagne
            await this.initializeCampaignContext(campaignId.toString())

            // Récupérer tous les followers ayant reçu un message
            const followersWithMessages = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .where('message_sent', true)

            console.log(`Checking responses for ${followersWithMessages.length} followers`)

            let responsesCount = 0
            let checkedCount = 0
            
            for (const followerCampaign of followersWithMessages) {
                try {
                    const hasResponse = await this.checkFollowerResponse(followerCampaign)
                    if (hasResponse) {
                        responsesCount++
                        
                        // Mettre à jour le statut de réponse
                        followerCampaign.responseReceived = true
                        followerCampaign.responseReceivedAt = DateTime.now()
                        await followerCampaign.save()
                    }
                    
                    checkedCount++
                    
                    // Log progress every 10 followers
                    if (checkedCount % 10 === 0) {
                        console.log(`Progress: ${checkedCount}/${followersWithMessages.length} checked, ${responsesCount} responses found`)
                    }
                    
                } catch (error) {
                    console.error(`Error checking response for ${followerCampaign.followerHandle}:`, error)
                }
            }

            console.log(`Response check completed: ${responsesCount} responses found out of ${checkedCount} checked`)

            return response.json({
                success: true,
                responsesFound: responsesCount,
                followersChecked: checkedCount,
                totalFollowersWithMessages: followersWithMessages.length
            })

        } catch (error) {
            console.error('Error counting responses:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Vérifier si un follower a répondu au message de campagne
     */
    private async checkFollowerResponse(followerCampaign: FollowerCampaign): Promise<boolean> {
        try {
            // Vérifier que nous avons la date d'envoi du message de campagne
            if (!followerCampaign.messageSentAt) {
                console.warn(`No campaign message sent date for ${followerCampaign.followerHandle}`)
                return false
            }

            // Récupérer la conversation avec ce follower
            const convo = await this.withRetry(
                () => {
                    if (!this.accountService) {
                        throw new Error('Account Service not defined')
                    }
                    return this.accountService.getConvoFromMembers(
                        this.currentAccount, 
                        [this.currentAccount.at_session!.did, followerCampaign.followerDid]
                    )
                },
                'getConvoFromMembers'
            )

            if (!convo) {
                console.warn(`No conversation found for ${followerCampaign.followerHandle}`)
                return false
            }

            console.log(`Checking conversation for ${followerCampaign.followerHandle}:`, {
                id: convo.id,
                campaignMessageSentAt: followerCampaign.messageSentAt.toISO()
            })

            // Récupérer tous les messages de la conversation
            const allMessages = await this.getAllConversationMessages(convo.id)
            
            if (!allMessages || allMessages.length === 0) {
                console.log(`No messages found for ${followerCampaign.followerHandle}`)
                return false
            }

            // Filtrer les messages envoyés après notre message de campagne
            const campaignMessageTime = followerCampaign.messageSentAt.toMillis()
            const messagesAfterCampaign = allMessages
                .filter(msg => {
                    if (!msg.sentAt) return false
                    const messageTime = new Date(msg.sentAt).getTime()
                    return messageTime > campaignMessageTime
                })
                .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) // Trier par ordre chronologique

            console.log(`Found ${messagesAfterCampaign.length} messages after campaign message for ${followerCampaign.followerHandle}`)

            // Chercher le premier message qui vient du follower (pas de nous)
            for (const message of messagesAfterCampaign) {
                const isFromFollower = message.sender?.did === followerCampaign.followerDid
                
                if (isFromFollower) {
                    console.log(`✅ Response found from ${followerCampaign.followerHandle}: "${message.text}" sent at ${message.sentAt}`)
                    return true
                }
            }

            console.log(`❌ No response found from ${followerCampaign.followerHandle} after campaign message`)
            return false

        } catch (error) {
            console.error(`Error checking response for ${followerCampaign.followerHandle}:`, error)
            return false
        }
    }

    /**
     * Récupérer tous les messages d'une conversation en utilisant la pagination
     */
    private async getAllConversationMessages(convoId: string): Promise<any[]> {
        let allMessages: any[] = []
        let cursor: string | undefined

        try {
            do {
                const messages = await this.withRetry(
                    () => {
                        if (!this.accountService) {
                            throw new Error('Account Service not defined')
                        }
                        return this.accountService.getMessages(this.currentAccount, convoId, cursor)
                    },
                    'getMessages'
                )

                if (!messages || messages.length === 0) {
                    break
                }

                allMessages.push(...messages)
                
                // Vérifier s'il y a d'autres pages (la logique dépend de l'API Bluesky)
                // Si la longueur des messages retournés est inférieure à la limite, on a probablement tout récupéré
                if (messages.length < 100) { // 100 est probablement la limite par défaut
                    break
                }

                // Pour la pagination, il faudrait vérifier comment l'API Bluesky gère le cursor
                // Pour l'instant, on sort de la boucle pour éviter une boucle infinie
                break

            } while (cursor)

        } catch (error) {
            console.error('Error fetching all conversation messages:', error)
        }

        return allMessages
    }

    // =====================================
    // NOUVELLES MÉTHODES - MESSAGES MULTIPLES
    // =====================================

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

    // =====================================
    // NOUVELLES MÉTHODES - TRACKING CONVERSATIONS
    // =====================================

    /**
     * Vérifier les conversations existantes pour une campagne
     */
    public async checkConversations({ params, response }: HttpContext) {
        try {
            const campaignId = params.id
            const campaign = await DmCampaign.findOrFail(campaignId)

            // Lancer la vérification en arrière-plan
            this.conversationTrackingService.checkExistingConversations(campaign)
                .catch(error => console.error('Background conversation check failed:', error))

            return response.json({
                success: true,
                message: 'Conversation check started'
            })
        } catch (error) {
            console.error('Error starting conversation check:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Marquer un follower comme contacté manuellement
     */
    public async markAsContacted({ params, response }: HttpContext) {
        try {
            const { id: campaignId, followerId } = params
            const follower = await FollowerCampaign.findOrFail(followerId)

            if (follower.dmCampaignId !== parseInt(campaignId)) {
                return response.status(400).json({
                    success: false,
                    error: 'Follower does not belong to this campaign'
                })
            }

            await this.conversationTrackingService.markAsContacted(
                follower.followerDid,
                'manual_mark',
                undefined
            )

            return response.json({
                success: true,
                message: 'Follower marked as contacted'
            })
        } catch (error) {
            console.error('Error marking follower as contacted:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Obtenir le statut des conversations pour une campagne
     */
    public async getConversationStatus({ params, response }: HttpContext) {
        try {
            const campaignId = params.id
            const status = await this.conversationTrackingService.getConversationStatus(campaignId)

            return response.json({
                success: true,
                status
            })
        } catch (error) {
            console.error('Error getting conversation status:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    /**
     * Marquer comme contactés tous les followers avec des conversations non vides
     */
    public async markAllExistingConversationsAsContacted({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Initialiser le contexte de campagne pour accéder aux tokens
            await this.initializeCampaignContext(campaignId)

            // Récupérer tous les followers non contactés
            const followers = await FollowerCampaign.query()
                .where('dmCampaignId', campaignId)
                .where('alreadyContacted', false)

            let updatedCount = 0

            // Traiter en parallèle avec contrôle de concurrence
            const BATCH_SIZE = 50 // Traiter 50 followers en parallèle
            const batches = []
            
            for (let i = 0; i < followers.length; i += BATCH_SIZE) {
                batches.push(followers.slice(i, i + BATCH_SIZE))
            }

            console.log(`Processing ${followers.length} followers in ${batches.length} batches of ${BATCH_SIZE}`)

            for (const batch of batches) {
                const promises = batch.map(async (followerCampaign) => {
                    try {
                        // Vérifier s'il existe une conversation avec ce follower
                        if (!this.accountService || !this.currentAccount.at_session) {
                            throw new Error("Account service or session not available")
                        }

                        const did = this.currentAccount.at_session.did
                        const convo = await this.withRetry(
                            () => {
                                if (!this.accountService) throw new Error("Account service not found")
                                return this.accountService.getConvoFromMembers(
                                    this.currentAccount,
                                    [did, followerCampaign.followerDid]
                                )
                            },
                            'getConvoFromMembers'
                        )

                        if (convo) {
                            // Récupérer les messages de la conversation
                            const messages = await this.withRetry(
                                () => {
                                    if (!this.accountService) throw new Error("Account service not found")
                                    return this.accountService.getMessages(this.currentAccount, convo.id)
                                },
                                'getMessages'
                            ) as unknown as any[]

                            // Si la conversation contient des messages, marquer comme contacté
                            if (messages && messages.length > 0) {
                                followerCampaign.alreadyContacted = true
                                await followerCampaign.save()
                                console.log(`✓ Marked ${followerCampaign.followerHandle} as already contacted (${messages.length} messages)`)
                                return 1
                            }
                        }
                        return 0
                    } catch (error) {
                        // Gérer les cas spécifiques d'erreur sans log verbeux
                        if (error.message && error.message.includes('recipient has disabled incoming messages')) {
                            // Skip silencieusement - c'est normal que certains followers aient désactivé les DMs
                            return 0
                        } else if (error.message && error.message.includes('Erreur HTTP ! Statut : 400')) {
                            // Skip les autres erreurs 400 qui sont généralement des restrictions côté utilisateur
                            return 0
                        } else {
                            // Log seulement les vraies erreurs inattendues
                            console.error(`Error checking conversation for ${followerCampaign.followerHandle}:`, error.message)
                            return 0
                        }
                    }
                })

                // Attendre que tous les followers du batch soient traités
                const results = await Promise.all(promises)
                updatedCount += results.reduce((sum: number, count: number) => sum + count, 0)

                // Petit délai entre les batches pour éviter de surcharger l'API
                if (batches.indexOf(batch) < batches.length - 1) {
                    await this.delay(200)
                }

                console.log(`Batch ${batches.indexOf(batch) + 1}/${batches.length} completed. Updated so far: ${updatedCount}`)
            }

            return response.json({
                success: true,
                message: `${updatedCount} followers marked as already contacted`,
                updatedCount
            })

        } catch (error) {
            console.error('Error marking existing conversations as contacted:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    // ===== NOUVELLES MÉTHODES - EXECUTION DES CAMPAGNES =====

    public async getExecutionConfig({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Obtenir la configuration depuis le service d'exécution
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

    public async saveExecutionConfig({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const config = request.body()

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Sauvegarder la configuration
            await this.campaignExecutionService.saveExecutionConfig(campaignId, config as any)
            
            return response.json({
                success: true,
                message: 'Configuration sauvegardée avec succès'
            })
        } catch (error) {
            console.error('Error saving execution config:', error)
            return response.status(500).json({
                success: false,
                error: error.message
            })
        }
    }

    public async getExecutionPreview({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Obtenir l'aperçu depuis le service d'exécution
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

    public async validateExecutionConfig({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier que la campagne appartient à l'utilisateur
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Valider la configuration
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