import DmCampaign from '#models/dm_campaign'
import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import type { MessageViewSender } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import AccountService from '#services/account_service'
import { inject } from '@adonisjs/core'
import AccountManager from '#services/account_manager'

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

    public async startCampaign({ request, response, session }: HttpContext) {
        try {
            await this.toggleDmCampaignStatus({ request, response } as HttpContext)
            await this.initializeCampaignContext(request)
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
    private async initializeCampaignContext(request: HttpContext['request']) {
        const { campaign_id } = request.only(["campaign_id"])
        this.currentDmCampaign = await DmCampaign.findOrFail(campaign_id)

        const account_handle = this.currentDmCampaign.accountHandle
        this.currentAccount = await Account.findByOrFail("handle", account_handle)

        // Obtenir le AccountService via AccountManager
        this.accountService = await AccountManager.getOrCreateAccountService(this.currentAccount)
        if (!this.accountService) {
            throw new Error("Account service not found")
        }

        await this.refreshAuthTokens()
    }

    private async processFollowers() {
        let cursor = this.currentDmCampaign.followersCursor || undefined
        try {
            while (await this.shouldContinueProcessing()) {
                console.log("Fetching followers...")
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
                await this.processFollowersBatch(response.followers, this.currentAccount)
            }
            this.currentDmCampaign.followersCursor = cursor
            await this.currentDmCampaign.save()
        } catch (err) {
            console.log(err)
            return
        }
    }

    private async processFollowersBatch(followers: ProfileView[], account: Account) {
        for (const follow of followers) {
            try {
                if (await this.shouldContinueProcessing())
                    await this.processFollower(follow, account)
                else
                    return
            } catch (err) {
                await this.handleFollowerError(err, follow)
            }
        }
    }

    private async processFollower(follow: ProfileView, account: Account) {
        console.log("Procesing:", follow.handle)
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
                await this.processConversation(convo, account)
            }
        } catch (err) {
            console.error("Error while processing follower:", err)
            if (err.message === "TypeError: Cannot read properties of undefined (reading 'token')") {
                await this.refreshAuthTokens()
                await this.processFollower(follow, account)
            }
        }

    }

    private async processConversation(convo: any, account: Account) {
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
        } else if (this.currentDmCampaign.strategy === "all") {
            await this.sendCampaignMessage(convo, account)
            await this.incrementMessageCounter()
        } else if (this.currentDmCampaign.strategy === "not-received" && !messages.some(
            (msg) => typeof msg.text === "string" && msg.text.includes(this.currentDmCampaign.message)
        )) {
            await this.sendCampaignMessage(convo, account)
            await this.incrementMessageCounter()
        } else {
            console.warn("Won't send a message, because profile doesn't match campaign expetaction:")
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
                    { convoId: convo.id, message: { text: this.currentDmCampaign.message } },
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
        await this.accountService.createOrResumeSession(this.currentAccount)
        await this.currentAccount.refresh()

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

    private async getCampaignById(request: HttpContext['request']) {
        const { campaign_id } = request.only(["campaign_id"])
        return DmCampaign.findOrFail(campaign_id)
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
}