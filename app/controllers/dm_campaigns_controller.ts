import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Account from '#models/account'
import type { MessageViewSender } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import AccountService from '#services/account_service'
import AccountManager from '#services/account_manager'
import DmCampaignAnalysisService from '#services/dm_campaign_analysis_service'
import CampaignMessageService from '#services/campaign_message_service'
import ConversationTrackingService from '#services/conversation_tracking_service'
import CampaignExecutionService from '#services/campaign_execution_service'
import { formatKeywordsForStorage } from '../utils/keywords.js'
import { inject } from '@adonisjs/core'

interface AuthTokens {
    convoAuth: any
    messagesAuth: any
    sendMessageAuth: any
}

@inject()
export default class DmCampaignsController {
    // Variables d'état pour le traitement en cours
    private accountService: AccountService | undefined
    private authTokens!: AuthTokens
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
            const { name, accountHandle, strategy, keywords, excludeKeywords, targetCount, interestedThreshold, moderatelyInterestedThreshold } = request.only([
                "name", "accountHandle", "strategy", "keywords", "excludeKeywords", "targetCount", "interestedThreshold", "moderatelyInterestedThreshold"
            ])
            const user = auth.getUserOrFail()

            // Validation des données requises - message temporairement optionnel
            if (!name || !accountHandle || !keywords || keywords.length === 0) {
                throw new Error("Name, account handle and keywords are required")
            }

            // Ensure keywords is properly formatted as JSON array
            const processedKeywords = formatKeywordsForStorage(keywords)
            const processedExcludeKeywords = excludeKeywords && excludeKeywords.length > 0 
                ? formatKeywordsForStorage(excludeKeywords) 
                : null

            const campaign = await DmCampaign.create({
                name,
                strategy: strategy || 'semantic_analysis',
                accountHandle,
                // message supprimé temporairement
                user_id: user.id,
                keywords: processedKeywords,
                excludeKeywords: processedExcludeKeywords,
                targetCount: targetCount || 50,
                interestedThreshold: interestedThreshold || 0.7,
                moderatelyInterestedThreshold: moderatelyInterestedThreshold || 0.5,
                analysisStatus: 'pending',
                checkConversationsStatus: 'pending'
            })

            // Créer les messages par défaut pour la campagne
            await this.campaignMessageService.createDefaultMessages(campaign.id)

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
            return response.redirect().back()
        } catch (error) {
            console.error(error)
            return response.status(404).json({ error: error.message })
        }
    }

    public async startCampaign({ request, response, session, params }: HttpContext) {
        try {
            const campaignId = params.campaign_id || request.input('campaign_id')
            
            // Charger la campagne
            this.currentDmCampaign = await DmCampaign.findOrFail(campaignId)
            
            // Vérifier que la campagne a un targetCount défini
            if (!this.currentDmCampaign.targetCount || this.currentDmCampaign.targetCount <= 0) {
                session.flash('error', 'Le nombre de cibles (targetCount) doit être défini et supérieur à 0')
                return response.redirect().back()
            }
            
            // Démarrer la campagne si elle n'est pas déjà active
            if (!this.currentDmCampaign.status) {
                this.currentDmCampaign.status = true
                await this.currentDmCampaign.save()
            }

            await this.initializeCampaignContext(campaignId)
            
            if (!this.currentDmCampaign.status) {
                session.flash('error', 'La campagne est désactivée')
                return response.redirect().back()
            }
            
            // Traiter les followers avec respect du targetCount
            await this.processFollowersWithLimit()
            await this.updateCampaignCursor()
        } catch (error) {
            session.flash('error', 'Erreur: ' + error.message)
            console.error(error)
        } finally {
            await this.cleanupCampaign()
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

    private async processFollowersWithLimit() {
        let cursor = this.currentDmCampaign.followersCursor || undefined
        let messagesSent = 0
        const targetCount = this.currentDmCampaign.targetCount || 0
        
        try {
            while (await this.shouldContinueProcessing() && messagesSent < targetCount) {
                console.log(`Fetching followers... Messages sent: ${messagesSent}/${targetCount}`)
                if (!this.currentAccount.at_session?.did) {
                    throw new Error('Account session or DID is missing')
                }
                if (!this.accountService) {
                    throw new Error('Account Service not defined in Process followers')
                }
                let response = await this.accountService.getFollowers(this.currentAccount, this.currentAccount.at_session.did, cursor)
                console.log(response.cursor)
                if (!response.cursor) {
                    break
                }
                cursor = response.cursor
                
                // Traiter le batch avec limite
                const remainingCount = targetCount - messagesSent
                messagesSent += await this.processFollowersBatchWithLimit(response.followers, this.currentAccount, remainingCount)
                
                // Arrêter si on a atteint la limite
                if (messagesSent >= targetCount) {
                    console.log(`Target count reached: ${messagesSent}/${targetCount}`)
                    break
                }
            }
            this.currentDmCampaign.followersCursor = cursor
            await this.currentDmCampaign.save()
        } catch (err) {
            console.log(err)
            return
        }
    }

    private async processFollowersBatchWithLimit(followers: ProfileView[], account: Account, maxMessages: number): Promise<number> {
        let messagesSent = 0
        for (const follow of followers) {
            if (messagesSent >= maxMessages) {
                console.log(`Batch limit reached: ${messagesSent}/${maxMessages}`)
                break
            }
            
            try {
                if (await this.shouldContinueProcessing()) {
                    const messageSentToThisFollower = await this.processFollowerWithTracking(follow, account)
                    if (messageSentToThisFollower) {
                        messagesSent++
                    }
                } else {
                    break
                }
            } catch (err) {
                await this.handleFollowerError(err, follow)
            }
        }
        return messagesSent
    }

    private async processFollowerWithTracking(follow: ProfileView, account: Account): Promise<boolean> {
        console.log("Processing:", follow.handle)
        try {
            await this.checkAndRefreshAuth()
            if (!this.currentAccount.at_session) {
                throw new Error("Account session missing")
            }
            const did = this.currentAccount.at_session.did

            const convo = await this.withRetry(
                () => {
                    if (!this.accountService) {
                        throw new Error('Account Service not defined in Process followers')
                    }
                    return this.accountService.getConvoFromMembers(account, [did as string, follow.did])
                },
                'getConvoFromMembers'
            )

            if (convo) {
                return await this.processConversationWithTracking(convo, account)
            }
            return false
        } catch (err) {
            console.error("Error while processing follower:", err)
            if (err.message === "TypeError: Cannot read properties of undefined (reading 'token')") {
                await this.refreshAuthTokens()
                return await this.processFollowerWithTracking(follow, account)
            }
            return false
        }
    }

    private async processConversationWithTracking(convo: any, account: Account): Promise<boolean> {
        const messages = await this.withRetry(
            () => {
                if (!this.accountService) {
                    throw new Error('Account Service not defined in Process followers')
                }
                return this.accountService.getMessages(account, convo.id)
            },
            'getMessages'
        ) as unknown as MessageViewSender[]


        if (messages.length === 0 && this.currentDmCampaign.strategy === "no-interaction") {
            await this.sendCampaignMessage(convo, account)
            await this.incrementMessageCounter()
            return true
        } else if (this.currentDmCampaign.strategy === "all") {
            await this.sendCampaignMessage(convo, account)
            await this.incrementMessageCounter()
            return true
        } else if (this.currentDmCampaign.strategy === "not-received" && !messages.some(
            (msg) => typeof msg.text === "string" && msg.text.includes("TODO: Check campaign messages")
        )) {
            await this.sendCampaignMessage(convo, account)
            await this.incrementMessageCounter()
            return true
        } else {
            console.warn("Won't send a message, because profile doesn't match campaign expetaction:")
            return false
        }
    }
    private async sendCampaignMessage(convo: any, account: Account) {
        await this.withRetry(
            () => {
                if (!this.accountService) {
                    throw new Error('Account Service not defined in sendCampaignMessage')
                }
                return this.accountService.sendMessageToConvo(
                    account,
                    { convoId: convo.id, message: { text: "TODO: Use campaign message based on interest level" } },
                )
            },
            'sendMessageToConvo'
        )
    }

    private async checkAndRefreshAuth() {
        if (this.isJwtExpired(this.currentAccount.at_session?.accessJwt)) {
            await this.refreshAuthTokens()
        }
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

        this.authTokens = {
            convoAuth: await this.accountService.getConvoToken(this.currentAccount),
            messagesAuth: await this.accountService.getMessagesToken(this.currentAccount),
            sendMessageAuth: await this.accountService.getChatToken(this.currentAccount),
        }
        console.warn("Tokens refreshed", this.authTokens)
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

    private async cleanupCampaign() {
        if (this.currentDmCampaign) {
            this.currentDmCampaign.status = false
            await this.currentDmCampaign.save()
        }
    }

    private async shouldContinueProcessing(): Promise<boolean> {
        await this.currentDmCampaign.refresh()
        return this.currentDmCampaign.status
    }

    private async updateCampaignCursor(cursor?: string): Promise<string | undefined> {
        if (cursor !== undefined && this.currentDmCampaign.followersCursor !== cursor) {
            this.currentDmCampaign.followersCursor = cursor
            await this.currentDmCampaign.save()
        }
        await this.delay(3000)
        return cursor
    }

    private async incrementMessageCounter() {
        this.currentDmCampaign.number_of_message_sent++
        await this.currentDmCampaign.save()
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

    private async handleFollowerError(err: any, follow: any) {
        if (err.statusCode === 429) {
            const retryAfter = err.response?.headers?.['retry-after'] || 60
            await this.delay(retryAfter * 1000)
        } else {
            console.error(`Erreur avec ${follow.handle}:`, err.message, err)
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
            
            const { name, message, targetCount, keywords, excludeKeywords, interestedThreshold, moderatelyInterestedThreshold } = request.only([
                'name', 'message', 'targetCount', 'keywords', 'excludeKeywords', 'interestedThreshold', 'moderatelyInterestedThreshold'
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
            if (!name || !message || !keywords) {
                return response.status(400).json({ 
                    error: 'Name, message and keywords are required' 
                })
            }

            // Mettre à jour la campagne
            campaign.name = name
            // campaign.message removed - now handled by campaign messages
            campaign.targetCount = targetCount || campaign.targetCount
            campaign.keywords = keywords
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

            console.log(`Executing campaign for ${targetFollowers.length} followers (requested: ${finalTargetCount})`)

            // Initialiser le contexte de campagne pour l'exécution
            await this.initializeCampaignContext(campaignId.toString())

            // Traiter les followers sélectionnés
            let messagesSent = 0
            for (const followerCampaign of targetFollowers) {
                try {
                    // Simuler l'envoi de message (à adapter selon votre logique)
                    await this.sendMessageToFollower(followerCampaign)
                    
                    followerCampaign.messageSent = true
                    followerCampaign.messageSentAt = DateTime.now()
                    await followerCampaign.save()
                    
                    messagesSent++
                    console.log(`Message sent ${messagesSent}/${finalTargetCount}`)
                } catch (error) {
                    console.error(`Failed to send message to ${followerCampaign.followerHandle}:`, error)
                }
            }

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

            // Calculer les statistiques
            const stats = await this.calculateCampaignStats(campaign)

            // Récupérer quelques followers pour l'affichage (limité pour performance)
            const followers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .orderBy('similarity_score', 'desc')
                .limit(100)

            return inertia.render('CampaignDashboard', {
                user: user.toJSON(),
                campaign: campaign.toJSON(),
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
                responsesReceived: 0 // TODO: calculer depuis FollowerCampaign quand disponible
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
     * Envoyer un message à un follower spécifique
     */
    private async sendMessageToFollower(followerCampaign: FollowerCampaign) {
        try {
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
                await this.withRetry(
                    () => {
                        if (!this.accountService) {
                            throw new Error('Account Service not defined')
                        }
                        return this.accountService.sendMessageToConvo(
                            this.currentAccount,
                            { 
                                convoId: convo.id, 
                                message: { text: "TODO: Use campaign message based on interest level" } 
                            }
                        )
                    },
                    'sendMessageToConvo'
                )
            }
        } catch (error) {
            console.error(`Error sending message to ${followerCampaign.followerHandle}:`, error)
            throw error
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
            const { interestLevel, message, subject } = request.only(['interestLevel', 'message', 'subject'])

            if (!interestLevel || !message) {
                return response.status(400).json({
                    success: false,
                    error: 'Interest level and message are required'
                })
            }

            const campaignMessage = await this.campaignMessageService.createMessage({
                dmCampaignId: campaignId,
                interestLevel,
                message,
                subject
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
            const campaign = await DmCampaign.query()
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
            await this.campaignExecutionService.saveExecutionConfig(campaignId, config)
            
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