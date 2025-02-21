import DmCampaign from '#models/dm_campaign'
import { HttpContext } from '@adonisjs/core/http'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
import Account from '#models/account'
import { getMessages, sendMessageToConvo, getConvoFromMembers } from '../bluesky/chatAPI.js'
import type { MessageViewSender } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
import type UserBotService from '../bluesky/user_bot_service.js'
import type { Agent } from '@atproto/api'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'

interface AuthTokens {
    convoAuth: any
    messagesAuth: any
    sendMessageAuth: any
}

export default class DmCampaignsController {
    // Variables d'état pour le traitement en cours
    private currentAccount!: Account
    private currentDmCampaign!: DmCampaign
    private userBotService!: UserBotService | undefined
    private agent!: Agent
    private authTokens!: AuthTokens
    public async createDmCampaign({ request, response, auth, session }: HttpContext) {
        try {
            const { account_handle, campaign_name, campaign_message, campaign_target, keywords } = request.only(["account_handle", "campaign_name", "campaign_message", "campaign_target", "keywords"])
            const user = auth.getUserOrFail()

            await DmCampaign.create({
                name: campaign_name,
                strategy: campaign_target,
                accountHandle: account_handle,
                message: campaign_message,
                user_id: user.id,
                keywords: JSON.stringify(keywords)
            })

            return response.redirect("/DM_Campaigns")
        } catch (err) {
            session.flash("error.badRequest", err.message)
            console.error(err)
            return response.redirect().back()
        }
    }


    public async toggleDmCampaignStatus({ request, response }: HttpContext) {
        try {
            const campaign = await this.getCampaignById(request)
            campaign.status = !campaign.status
            await campaign.save()
        } catch (error) {
            console.error(error)
            return response.status(404).send(error.message)
        }
    }

    public async removeDmCampaign({ request, response }: HttpContext) {
        try {
            const campaign = await this.getCampaignById(request)
            await campaign.delete()
            return response.redirect().back()
        } catch (error) {
            console.error(error)
            return response.status(404).send(error.message)
        }
    }

    public async startCampaign({ request, response, auth, session }: HttpContext) {
        try {
            await this.toggleDmCampaignStatus({ request, response } as HttpContext)
            await this.initializeCampaignContext(request, auth)
            if (!this.currentDmCampaign.status) {
                session.flash('error', 'La campagne est désactivée')
                return response.redirect().back()
            }
            await this.processFollowers()
            await this.updateCampaignCursor()
        } catch (error) {
            session.flash('error', 'Erreur: ' + error.message)
            console.error(error)
        } finally {
            await this.cleanupCampaign()
        }
    }

    //#region Méthodes privées
    private async initializeCampaignContext(request: HttpContext['request'], auth: HttpContext['auth']) {
        const user = auth.getUserOrFail()
        this.userBotService = users_bot_service_manager.userbotServiceMap.get(user.id)
        if (!this.userBotService) {
            await users_bot_service_manager.initOneUserBotService(user.id)
            this.userBotService = users_bot_service_manager.userbotServiceMap.get(user.id)
            if (!this.userBotService)
                throw new Error("User bot service not found")
        }
        const { campaign_id } = request.only(["campaign_id"])
        this.currentDmCampaign = await DmCampaign.findOrFail(campaign_id)

        const account_handle = this.currentDmCampaign.accountHandle
        this.currentAccount = await Account.findByOrFail("handle", account_handle)

        this.agent = this.userBotService.agent
        await this.refreshAuthTokens()
    }

    private async processFollowers() {
        let cursor = this.currentDmCampaign.followersCursor || undefined

        while (await this.shouldContinueProcessing()) {
            let response = await this.agent.getFollowers(
                {
                    actor: this.currentAccount.did,
                    cursor: cursor
                }
            )
            if (!response.data.cursor) {
                break
            }
            cursor = response.data.cursor
            await this.processFollowersBatch(response.data.followers)
        }
        this.currentDmCampaign.followersCursor = cursor
        await this.currentDmCampaign.save()
    }

    private async processFollowersBatch(followers: ProfileView[]) {
        for (const follow of followers) {
            try {
                if (await this.shouldContinueProcessing())
                    await this.processFollower(follow)
                else
                    return
            } catch (err) {
                await this.handleFollowerError(err, follow)
            }
        }
    }

    private async processFollower(follow: ProfileView) {
        console.log("Procesing:", follow.handle)
        await this.checkAndRefreshAuth()

        const convo = await this.withRetry(
            () => getConvoFromMembers([this.currentAccount.did, follow.did], this.authTokens.convoAuth.data.token),
            'getConvoFromMembers'
        )

        if (convo) {
            await this.processConversation(convo)
        }
    }

    private async processConversation(convo: any) {
        const messages = await this.withRetry(
            () => getMessages(convo.id, this.authTokens.messagesAuth.data.token),
            'getMessages'
        ) as unknown as MessageViewSender[]


        if (messages.length === 0 && this.currentDmCampaign.strategy === "no-interaction") {
            await this.sendCampaignMessage(convo)
            await this.incrementMessageCounter()
        } else if (this.currentDmCampaign.strategy === "all") {
            await this.sendCampaignMessage(convo)
            await this.incrementMessageCounter()
        } else if (this.currentDmCampaign.strategy === "not-received" && !messages.some(
            (msg) => typeof msg.text === "string" && msg.text.includes(this.currentDmCampaign.message)
        )) {
            await this.sendCampaignMessage(convo)
            await this.incrementMessageCounter()
        } else {
            console.warn("Won't send a message, because profile doesn't match campaign expetaction:")
        }
    }

    private async sendCampaignMessage(convo: any) {
        await this.withRetry(
            () => sendMessageToConvo(
                { convoId: convo.id, message: { text: this.currentDmCampaign.message } },
                this.authTokens.sendMessageAuth.data.token
            ),
            'sendMessageToConvo'
        )
        await this.delay(1500)
    }

    private async checkAndRefreshAuth() {
        if (this.isJwtExpired(this.currentAccount.at_session?.accessJwt)) {
            await this.refreshAuthTokens()
        }
    }

    private async refreshAuthTokens() {
        if (!this.userBotService) throw new Error("User bot service not found")
        await this.userBotService.createOrResumeSession(this.currentAccount)
        await this.currentAccount.refresh()

        if (!this.currentAccount.at_session) {
            throw new Error("Account session missing")
        }

        const authHeaders = { headers: { Authorization: `Bearer ${this.currentAccount.at_session.accessJwt}` } }

        this.authTokens = {
            convoAuth: await this.agent.com.atproto.server.getServiceAuth(
                { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" },
                authHeaders
            ),
            messagesAuth: await this.agent.com.atproto.server.getServiceAuth(
                { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages" },
                authHeaders
            ),
            sendMessageAuth: await this.agent.com.atproto.server.getServiceAuth(
                { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" },
                authHeaders
            )
        }
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

    private async getCampaignById(request: HttpContext['request']) {
        const { campaign_id } = request.only(["campaign_id"])
        return DmCampaign.findOrFail(campaign_id)
    }

    private async shouldContinueProcessing(): Promise<boolean> {
        await this.currentDmCampaign.refresh()
        return this.currentDmCampaign.status
    }

    private async updateCampaignCursor(cursor?: string): Promise<string | undefined> {
        if (this.currentDmCampaign.followersCursor != cursor) {
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
            console.error(`Erreur avec ${follow.handle}:`, err.message)
        }
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}