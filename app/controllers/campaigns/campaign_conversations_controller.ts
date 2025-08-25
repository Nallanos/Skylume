import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AccountService from '#services/account_service'
import AccountManager from '#services/account_manager'
import ConversationTrackingService from '#services/conversation_tracking_service'
import { inject } from '@adonisjs/core'

@inject()
export default class CampaignConversationsController {
    // Variables d'état pour le traitement en cours
    private accountService: AccountService | undefined
    private currentAccount!: Account

    constructor(
        protected accountManager: AccountManager,
        protected conversationTrackingService: ConversationTrackingService
    ) { }

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
    public async markAllExistingConversationsAsContacted({ params, response, auth, request }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const forceRescan = request.input('force_rescan', false)

            // Vérifier que la campagne appartient à l'utilisateur
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Initialiser le contexte de campagne pour accéder aux tokens
            await this.initializeCampaignContext(campaignId)

            // Récupérer tous les followers non contactés (ou tous si force_rescan)
            let query = FollowerCampaign.query().where('dm_campaign_id', campaignId)
            
            if (!forceRescan) {
                query = query.where('already_contacted', false)
            }
            
            const followers = await query

            console.log(`📊 Campaign ${campaignId} stats:`)
            
            // Compter tous les followers pour debug
            const totalFollowers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .count('* as total')
            
            const alreadyContactedFollowers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .where('already_contacted', true)
                .count('* as total')
            
            console.log(`   Total followers: ${totalFollowers[0].$extras.total}`)
            console.log(`   Already contacted: ${alreadyContactedFollowers[0].$extras.total}`)
            console.log(`   ${forceRescan ? 'To rescan' : 'Not contacted yet'}: ${followers.length}`)

            let updatedCount = 0

            const BATCH_SIZE = 30 // Traiter 30 followers en parallèle
            const batches = []

            for (let i = 0; i < followers.length; i += BATCH_SIZE) {
                batches.push(followers.slice(i, i + BATCH_SIZE))
            }

            console.log(`Processing ${followers.length} followers in ${batches.length} batches of ${BATCH_SIZE}`)

            for (const batch of batches) {
                const promises = batch.map(async (followerCampaign) => {
                    try {
                        if (!this.accountService || !this.currentAccount.at_session) {
                            throw new Error("Account service or session not available")
                        }

                        const did = this.currentAccount.at_session.did
                        console.log(`🔍 Checking conversations for ${followerCampaign.followerHandle}...`)
                        
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
                            console.log(`📧 Found conversation for ${followerCampaign.followerHandle}, checking messages...`)
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
                            } else {
                                console.log(`❌ No messages found for ${followerCampaign.followerHandle}`)
                            }
                        } else {
                            console.log(`❌ No conversation found for ${followerCampaign.followerHandle}`)
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
            await campaign.updateAlreadyContactedCountFromFollowers()
            console.log(`✅ Updated campaign alreadyContactedCount: ${campaign.alreadyContactedCount}`)

            updatedCount = campaign.alreadyContactedCount
            return response.json({
                success: true,
                message: `${updatedCount} followers marked as already contacted`,
                updatedCount,
            })

        } catch (error) {
            console.error('Error marking existing conversations as contacted:', error)
            return response.status(500).json({
                success: false,
                error: error.message
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
                const hasResponse = await this.checkFollowerResponse(followerCampaign)
                if (hasResponse) {
                    responsesCount++
                    // Marquer dans la base de données
                    followerCampaign.responseReceived = true
                    await followerCampaign.save()
                }
                checkedCount++

                // Progress log every 10 followers
                if (checkedCount % 10 === 0) {
                    console.log(`Progress: ${checkedCount}/${followersWithMessages.length} checked, ${responsesCount} responses found so far`)
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

    private async initializeCampaignContext(campaignId: string) {
        const campaign = await DmCampaign.findOrFail(campaignId)
        const account_handle = campaign.accountHandle
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
     * Vérifier si un follower a répondu au message de campagne
     */
    private async checkFollowerResponse(followerCampaign: FollowerCampaign): Promise<boolean> {
        try {
            // Vérifier que nous avons la date d'envoi du message de campagne
            if (!followerCampaign.messageSentAt) {
                console.log(`No message sent date for ${followerCampaign.followerHandle}, skipping`)
                return false
            }

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

            if (!convo) {
                console.log(`No conversation found for ${followerCampaign.followerHandle}`)
                return false
            }

            console.log(`Checking conversation for ${followerCampaign.followerHandle}:`, {
                id: convo.id,
                campaignMessageSentAt: followerCampaign.messageSentAt.toISO()
            })

            // Récupérer tous les messages de la conversation
            const allMessages = await this.getAllConversationMessages(convo.id)

            if (!allMessages || allMessages.length === 0) {
                console.log(`No messages found in conversation for ${followerCampaign.followerHandle}`)
                return false
            }

            // Filtrer les messages envoyés après notre message de campagne
            const campaignMessageTime = followerCampaign.messageSentAt.toMillis()
            const messagesAfterCampaign = allMessages
                .filter(msg => {
                    const msgTime = new Date(msg.sentAt).getTime()
                    return msgTime > campaignMessageTime
                })
                .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

            console.log(`Found ${messagesAfterCampaign.length} messages after campaign message for ${followerCampaign.followerHandle}`)

            // Chercher le premier message qui vient du follower (pas de nous)
            for (const message of messagesAfterCampaign) {
                if (message.sender && message.sender.did !== this.currentAccount.at_session?.did) {
                    console.log(`✅ Response found from ${followerCampaign.followerHandle}: "${message.text?.substring(0, 50)}..."`)
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
                const messagesResponse = await this.withRetry(
                    () => {
                        if (!this.accountService) throw new Error("Account service not found")
                        return this.accountService.getMessages(this.currentAccount, convoId, cursor)
                    },
                    'getMessages'
                ) as any

                if (messagesResponse && messagesResponse.messages) {
                    allMessages.push(...messagesResponse.messages)
                    cursor = messagesResponse.cursor
                } else {
                    cursor = undefined
                }
            } while (cursor)

        } catch (error) {
            console.error('Error fetching all conversation messages:', error)
        }

        return allMessages
    }
}
