import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import CampaignGroup from '#models/campaign_group'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Account from '#models/account'
import AccountService from '#services/account_service'
import AccountManager from '#services/account_manager'
import DmCampaignAnalysisService from '#services/dm_campaign_analysis_service'
import { inject } from '@adonisjs/core'

@inject()
export default class DmCampaignAnalysisController {
    // Variables d'état pour le traitement en cours
    private accountService: AccountService | undefined
    private currentAccount!: Account
    private currentDmCampaign!: DmCampaign

    constructor(
        protected accountManager: AccountManager, 
        protected analysisService: DmCampaignAnalysisService
    ) {}

    /**
     * Démarrer l'analyse des followers pour une campagne
     */
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
                return response.status(400).json({ 
                    error: 'Analysis is already in progress for this campaign' 
                })
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
                    message: 'Analysis started successfully!' 
                })
            }

            // Flash success message and redirect back
            session.flash('success', 'Analysis started successfully!')
            return response.redirect().back()

        } catch (error) {
            console.error('Error starting analysis:', error)
            
            // Check if this is an AJAX request
            if (request.header('X-Requested-With') === 'XMLHttpRequest') {
                return response.status(500).json({ 
                    success: false, 
                    error: error.message 
                })
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
            console.log(targetCount)
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

            // Vérifier qu'une exécution n'est pas déjà en cours
            if (campaign.executionStatus === 'running') {
                return response.status(400).json({ 
                    error: 'Campaign execution is already in progress' 
                })
            }

            // Validation du targetCount
            const finalTargetCount = targetCount || 0
            if (finalTargetCount <= 0) {
                return response.status(400).json({ 
                    error: 'Target count must be greater than 0' 
                })
            }

            console.log(`🎯 Starting campaign execution with target count: ${finalTargetCount}`)
            
            // ✅ FIX: Log current shouldPause state for debugging
            if (campaign.shouldPause) {
                console.log(`⚠️ Campaign ${campaignId} had shouldPause=true before execution start. Resetting to false.`)
            }

            // Initialiser l'état d'exécution
            campaign.executionStartedAt = DateTime.now()
            campaign.executionStatus = 'running'
            campaign.shouldStop = false
            campaign.shouldPause = false // ✅ FIX: Reset shouldPause to prevent automatic pause
            campaign.executionProgress = 0
            campaign.executionTargetCount = finalTargetCount
            campaign.executionCompletedAt = null
            await campaign.save()

            // Initialiser le contexte de campagne pour l'exécution
            await this.initializeCampaignContext(campaignId.toString())

            // Exécuter par groupes avec la limite globale (en arrière-plan)
            this.executeByGroupsAsync(campaign, finalTargetCount)
                .catch(error => {
                    console.error('❌ Error in background execution:', error)
                    // Marquer la campagne comme failed
                    campaign.executionStatus = 'failed'
                    campaign.executionCompletedAt = DateTime.now()
                    campaign.save()
                })

            return response.json({ 
                success: true,
                message: 'Campaign execution started',
                targetCount: finalTargetCount
            })

        } catch (error) {
            console.error('Error executing campaign:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Arrêter l'exécution d'une campagne
     */
    public async stopCampaignExecution({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            if (campaign.executionStatus !== 'running') {
                return response.status(400).json({ 
                    error: 'No active execution to stop' 
                })
            }

            // Marquer pour arrêt
            campaign.shouldStop = true
            campaign.executionStatus = 'stopping'
            await campaign.save()

            console.log(`🛑 Campaign execution stop requested for campaign ${campaignId}`)

            return response.json({ 
                success: true,
                message: 'Campaign execution stop requested'
            })

        } catch (error) {
            console.error('Error stopping campaign execution:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Mettre en pause l'exécution d'une campagne
     */
    public async pauseCampaignExecution({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            if (campaign.executionStatus !== 'running') {
                return response.status(400).json({ 
                    error: 'No active execution to pause' 
                })
            }

            // Marquer pour pause
            campaign.shouldPause = true
            campaign.executionStatus = 'paused'
            await campaign.save()

            console.log(`⏸️ Campaign execution pause requested for campaign ${campaignId}`)

            return response.json({ 
                success: true,
                message: 'Campaign execution paused'
            })

        } catch (error) {
            console.error('Error pausing campaign execution:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Reprendre l'exécution d'une campagne en pause
     */
    public async resumeCampaignExecution({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            if (campaign.executionStatus !== 'paused') {
                return response.status(400).json({ 
                    error: 'Campaign is not paused' 
                })
            }

            // Retirer la pause et relancer
            campaign.shouldPause = false
            campaign.executionStatus = 'running'
            await campaign.save()

            console.log(`▶️ Campaign execution resume requested for campaign ${campaignId}`)

            // Relancer l'exécution en arrière-plan avec le target count original
            this.executeByGroupsAsync(campaign, campaign.executionTargetCount || 0)

            return response.json({ 
                success: true,
                message: 'Campaign execution resumed'
            })

        } catch (error) {
            console.error('Error resuming campaign execution:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Obtenir le statut d'exécution d'une campagne
     */
    public async getExecutionStatus({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            return response.json({
                executionStatus: campaign.executionStatus,
                executionProgress: campaign.executionProgress || 0,
                executionTargetCount: campaign.executionTargetCount || 0,
                shouldStop: campaign.shouldStop || false,
                executionStartedAt: campaign.executionStartedAt,
                executionCompletedAt: campaign.executionCompletedAt
            })

        } catch (error) {
            console.error('Error getting execution status:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Exécution asynchrone avec suivi de progression
     */
    private async executeByGroupsAsync(campaign: DmCampaign, finalTargetCount: number): Promise<void> {
        try {
            const messagesSent = await this.executeByGroups(campaign, finalTargetCount)

            // Mettre à jour les statistiques de la campagne
            campaign.number_of_message_sent += messagesSent
            campaign.executionStatus = campaign.shouldStop ? 'stopped' : 'completed'
            campaign.executionCompletedAt = DateTime.now()
            await campaign.save()

            console.log(`Campaign execution completed: ${messagesSent} messages sent`)
        } catch (error) {
            console.error('❌ Error in executeByGroupsAsync:', error)
            campaign.executionStatus = 'failed'
            campaign.executionCompletedAt = DateTime.now()
            await campaign.save()
            throw error
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
     * Exécuter la campagne en traitant par groupe
     */
    private async executeByGroups(campaign: DmCampaign, finalTargetCount: number): Promise<number> {
        let totalMessagesSent = 0

        try {
            // Charger tous les groupes de la campagne avec leurs messages
            await campaign.load('groups', (groupQuery) => {
                groupQuery.preload('groupMessages').orderBy('order', 'asc')
            })

            console.log(`📊 Found ${campaign.groups.length} groups for campaign execution`)
            console.log(`🎯 Target to reach: ${finalTargetCount} contacts`)

            if (campaign.groups.length === 0) {
                console.warn(`⚠️ No groups found for campaign ${campaign.id}, cannot execute`)
                return 0
            }

            // Récupérer tous les followers disponibles pour cette campagne
            const allAvailableFollowers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaign.id)
                .where('message_sent', false)
                .where('already_contacted', false)
                .whereIn('interest_level', ['interested', 'moderately_interested'])
                .orderByRaw(`
                    CASE interest_level 
                        WHEN 'interested' THEN 1 
                        WHEN 'moderately_interested' THEN 2 
                        ELSE 3 
                    END
                `)
                .orderByRaw('RANDOM()')

            console.log(`📋 Found ${allAvailableFollowers.length} available followers`)

            // Traiter chaque groupe jusqu'à atteindre la limite globale
            for (const group of campaign.groups) {
                if (totalMessagesSent >= finalTargetCount) {
                    console.log(`🛑 Global target reached: ${totalMessagesSent}/${finalTargetCount}`)
                    break
                }

                console.log(`🎯 Processing group "${group.name}"`)
                
                // Filtrer les followers qui correspondent aux conditions du groupe
                const groupFollowers = await this.filterFollowersByGroup(allAvailableFollowers, group)
                
                if (groupFollowers.length === 0) {
                    console.log(`⚠️ No followers match conditions for group "${group.name}"`)
                    continue
                }
                
                // Récupérer le message du groupe
                const message = this.getGroupMessage(group)
                if (!message) {
                    console.warn(`⚠️ No message found for group "${group.name}", skipping`)
                    continue
                }
                
                console.log(`📤 Sending messages to ${groupFollowers.length} followers from group "${group.name}"`)
                
                // Envoyer des messages aux followers du groupe
                for (const followerCampaign of groupFollowers) {
                    // Vérifier si l'arrêt a été demandé
                    await campaign.refresh()
                    if (campaign.shouldStop) {
                        console.log(`🛑 Execution stop requested, stopping at ${totalMessagesSent} messages sent`)
                        return totalMessagesSent
                    }

                    // Vérifier si la pause a été demandée
                    if (campaign.shouldPause) {
                        console.log(`⏸️ Execution pause requested, pausing at ${totalMessagesSent} messages sent`)
                        campaign.executionStatus = 'paused'
                        await campaign.save()
                        return totalMessagesSent
                    }

                    if (totalMessagesSent >= finalTargetCount) {
                        console.log(`🛑 Global target reached: ${totalMessagesSent}/${finalTargetCount}`)
                        break
                    }
                    
                    try {
                        await this.sendMessageToSpecificFollower(followerCampaign, message, group)
                        
                        // Marquer comme envoyé dans la base de données
                        followerCampaign.messageSent = true
                        followerCampaign.messageSentAt = DateTime.now()
                        await followerCampaign.save()
                        
                        // ✅ NOUVEAU: Incrémenter le compteur de la campagne
                        await campaign.incrementAlreadyContactedCount()
                        
                        totalMessagesSent++
                        
                        // Mettre à jour le progrès en temps réel
                        campaign.executionProgress = totalMessagesSent
                        await campaign.save()
                        
                        console.log(`✅ Message sent to @${followerCampaign.followerHandle} (${totalMessagesSent}/${finalTargetCount})`)
                        
                        // Petit délai entre les messages pour éviter le rate limiting
                        await this.delay(1000)
                    } catch (error) {
                        console.error(`❌ Failed to send message to @${followerCampaign.followerHandle}:`, error)
                        // Continuer avec le follower suivant
                    }
                }
                
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
    private async filterFollowersByGroup(followers: FollowerCampaign[], group: CampaignGroup): Promise<FollowerCampaign[]> {
        const conditions = group.conditions
        if (!conditions) {
            console.warn(`Group "${group.name}" has no conditions, including all followers`)
            return followers
        }

        console.log(`🔍 Filtering ${followers.length} followers for group "${group.name}"`)
        console.log(`🎯 Group conditions:`, conditions)
        
        const matchingFollowers: FollowerCampaign[] = []
        
        for (const follower of followers) {
            // Mettre à jour le nombre de followers si nécessaire
            if (follower.followersCount === 0 && this.accountService && follower.followerHandle) {
                try {
                    const profile = await this.accountService.getProfile(follower.followerHandle)
                    follower.followersCount = profile.followersCount || 0
                    await follower.save()
                    console.log(`🔄 Updated follower count for @${follower.followerHandle}: ${follower.followersCount}`)
                } catch (error) {
                    console.warn(`Could not fetch follower count for @${follower.followerHandle}`)
                }
            }
            
            console.log(`📊 Checking @${follower.followerHandle} (${follower.followersCount || 0} followers)`)
            const matches = this.checkGroupConditions(conditions, follower)
            console.log(`✅ Result for @${follower.followerHandle}: ${matches ? 'MATCHES' : 'DOES NOT MATCH'}`)
            
            if (matches) {
                matchingFollowers.push(follower)
            }
        }

        console.log(`🎯 Result: ${matchingFollowers.length}/${followers.length} followers match conditions for group "${group.name}"`)
        return matchingFollowers
    }

    /**
     * Vérifier si les conditions d'un groupe correspondent à un follower
     */
    private checkGroupConditions(conditions: Record<string, any>, followerCampaign: FollowerCampaign): boolean {
        if (!conditions) {
            console.log(`⚠️ No conditions provided`)
            return false
        }

        console.log(`🔍 Checking conditions for @${followerCampaign.followerHandle}:`, conditions)

        // Support pour le nouveau format array de conditions
        if (Array.isArray(conditions)) {
            console.log(`📋 Processing array of ${conditions.length} conditions (AND logic)`)
            
            // Toutes les conditions doivent être vraies (logique AND)
            for (let i = 0; i < conditions.length; i++) {
                const condition = conditions[i]
                console.log(`🔍 Checking condition ${i + 1}:`, condition)
                
                if (!this.evaluateCondition(condition, followerCampaign)) {
                    console.log(`❌ Condition ${i + 1} failed, returning false`)
                    return false
                }
                console.log(`✅ Condition ${i + 1} passed`)
            }
            
            console.log(`✅ All ${conditions.length} conditions passed`)
            return true
        }

        // Si les conditions sont dans le format simple {field, operator, value}
        if (conditions.field && conditions.operator && conditions.value !== undefined) {
            const result = this.evaluateCondition(conditions, followerCampaign)
            console.log(`📋 Single condition result: ${result}`)
            return result
        }

        // Si les conditions sont dans un format plus complexe, itérer
        for (const [key, condition] of Object.entries(conditions)) {
            console.log(`🔍 Checking condition key "${key}":`, condition)
            
            if (typeof condition === 'object' && condition && condition.field) {
                const result = this.evaluateCondition(condition, followerCampaign)
                console.log(`📋 Condition "${key}" result: ${result}`)
                
                if (result) {
                    console.log(`✅ Condition "${key}" matched, returning true`)
                    return true
                }
            } else {
                console.log(`⚠️ Invalid condition format for key "${key}":`, typeof condition, condition)
            }
        }

        console.log(`❌ No conditions matched for @${followerCampaign.followerHandle}`)
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
                    if (!this.accountService || !this.currentAccount.at_session) {
                        throw new Error("Account service or session not available")
                    }
                    const did = this.currentAccount.at_session.did
                    return this.accountService.getConvoFromMembers(this.currentAccount, [did, followerCampaign.followerDid])
                },
                'getConvoFromMembers'
            )

            if (convo) {
                console.log(`💬 Found conversation: ${convo.id}`)
                
                // VÉRIFICATION CRITIQUE : Vérifier si la conversation contient déjà des messages
                const existingMessages = await this.withRetry(
                    () => {
                        if (!this.accountService) {
                            throw new Error('Account Service not defined')
                        }
                        return this.accountService.getMessages(this.currentAccount, convo.id)
                    },
                    'getMessages'
                ) as unknown as any[]

                // Si la conversation contient déjà des messages, ne pas envoyer de nouveau message
                if (existingMessages && existingMessages.length > 0) {
                    console.log(`⚠️ Conversation with @${followerCampaign.followerHandle} already has ${existingMessages.length} messages. Skipping send and marking as already contacted.`)
                    
                    // Marquer le follower comme déjà contacté
                    followerCampaign.alreadyContacted = true
                    await followerCampaign.save()
                    
                    // Ne pas envoyer de message
                    return
                }
                
                // Si la conversation est vide, procéder à l'envoi
                console.log(`✅ Conversation is empty, proceeding to send message`)
                
                // Envoyer le message avec facets pour rich text
                await this.withRetry(
                    () => {
                        if (!this.accountService) throw new Error("Account service not found")
                        return this.accountService.sendMessageToConvo(
                            this.currentAccount,
                            { 
                                convoId: convo.id, 
                                message: { 
                                    text: messageResult.text,
                                    facets: messageResult.facets 
                                } 
                            }
                        )
                    },
                    'sendMessageToConvo'
                )
                console.log(`✅ Message sent successfully to @${followerCampaign.followerHandle}`)
            } else {
                console.warn(`❌ No conversation found with @${followerCampaign.followerHandle}`)
                throw new Error(`No conversation found with @${followerCampaign.followerHandle}`)
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
            return { text: message }
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
                console.log(`✅ Replaced {{${variable.name}}} with "${variableValue}"`)
            } else {
                console.log(`⚠️ Variable {{${variable.name}}} not found in message`)
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
                let count = followerCampaign.followersCount || 0
                
                // Si le count est 0, essayer de le récupérer via l'API
                if (count === 0 && this.accountService && followerCampaign.followerHandle) {
                    try {
                        const profile = await this.accountService.getProfile(followerCampaign.followerHandle)
                        count = profile.followersCount || 0
                        // Mettre à jour le count dans la DB
                        followerCampaign.followersCount = count
                        await followerCampaign.save()
                        console.log(`🔄 Updated follower count for @${followerCampaign.followerHandle}: ${count}`)
                    } catch (error) {
                        console.warn(`⚠️ Could not fetch follower count for @${followerCampaign.followerHandle}:`, error.message)
                    }
                }
                
                // Appliquer la configuration de rounding si présente
                const config = variable.configuration
                if (config && config.rounding) {
                    switch (config.rounding) {
                        case 'thousands':
                            const roundedToThousands = Math.round(count / 1000)
                            const formattedThousands = `${roundedToThousands}k`
                            console.log(`📊 Rounded ${count} to ${formattedThousands} (round to thousands)`)
                            return formattedThousands
                        
                        case 'hundreds':
                            const roundedToHundreds = Math.round(count / 100)
                            const formattedHundreds = `${roundedToHundreds}00`
                            console.log(`📊 Rounded ${count} to ${formattedHundreds} (round to hundreds)`)
                            return formattedHundreds
                        
                        default:
                            console.log(`⚠️ Unknown rounding type: ${config.rounding}`)
                    }
                }
                
                return count.toString()
            
            case 'display_name':
                return followerCampaign.followerHandle || 'Unknown'
            
            case 'handle':
                return followerCampaign.followerHandle || 'Unknown'
            
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
                const linkIndex = processedMessage.indexOf(link.text)
                if (linkIndex !== -1) {
                    // Calculer les positions en bytes pour AT Protocol
                    const textEncoder = new TextEncoder()
                    const beforeLinkBytes = textEncoder.encode(processedMessage.substring(0, linkIndex)).length
                    const linkTextBytes = textEncoder.encode(link.text).length
                    
                    facets.push({
                        index: {
                            byteStart: beforeLinkBytes,
                            byteEnd: beforeLinkBytes + linkTextBytes
                        },
                        features: [{
                            $type: 'app.bsky.richtext.facet#link',
                            uri: link.url
                        }]
                    })
                    
                    console.log(`🔗 Created facet for "${link.text}" -> "${link.url}" (bytes: ${beforeLinkBytes}-${beforeLinkBytes + linkTextBytes})`)
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
}
