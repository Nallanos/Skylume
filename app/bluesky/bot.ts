import { AtpAgent } from "@atproto/api";
import { getConvoFromMembers, sendMessageToConvo } from "./chatAPI.js";
import Account from "#models/account";
import type { MessagePayload } from "./types.js";
import type { RateLimitedAgent } from "@skyware/bot";
export class EventListener {
    constructor(
        private chatAgent: RateLimitedAgent,
        private agent: AtpAgent,
        private event: string,
        public action: string,
        public listener_id: string,
        private account_id: string,
        private message?: string,
    ) { }

    /**
     * Activates event listening based on configured action
     */
    async on(did: string): Promise<void> {
        if (this.event == "follow") {
            if (this.action == "Send a Message" && this.message) {
                console.log(`sending ${this.message} to ${did}`)
                await this.onFollowSendMessage(did)
            } else if (this.action == "Follow") {
                console.log(`following ${did}`)
                await this.agent.follow(did)
            }
        }
    }

    /**
     * Sends a message when a follow event occurs
     */
    public async onFollowSendMessage(authorDid: string): Promise<void> {
        try {
            const account = await Account.find(this.account_id)
            if (!account) {
                throw new Error(`can't find account with the following account_id: ${this.account_id}`)
            }
            console.log("in send message")
            if (this.message == undefined) {
                throw new Error("given message is undefined")
            }
            const convo = await getConvoFromMembers([authorDid], this.chatAgent)
            if (!convo) {
                throw new Error("convos is undefined")
            }
            const sendMessagePayload: MessagePayload = {
                convoId: convo.id,
                message: {
                    text: this.message
                }
            }
            await sendMessageToConvo(sendMessagePayload, this.chatAgent)
        } catch (err) {
            console.log("error while sending message on follow:", err)
        }
    }

    /**
     * Removes all event listeners
     */
    public removeListener(): void {
    }
}
