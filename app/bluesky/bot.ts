import { getConvoFromMembers, sendMessageToConvo } from "./chatAPI.js";
import type { MessagePayload } from "./types.js";
import Account from "#models/account";
import { AtpAgent } from "@atproto/api";
export class EventListener {
    constructor(
        private agent: AtpAgent,
        private event: string,
        public action: string,
        public listener_id: string,
        private account_id: string,
        private message?: string,
    ) {

    }

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

            if (account.at_session?.handle == undefined) {
                throw new Error("handle is undefined")
            }



            console.log("in send message")

            if (this.message == undefined) {
                throw new Error("given message is undefined")
            }

            let res = await this.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" });

            console.log(res.data.token)
            res = await this.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } })
            let chatToken = res.data.token
            const convo = await getConvoFromMembers([authorDid], chatToken)
            if (!convo) {
                throw new Error("convos is undefined")
            }
            const sendMessagePayload: MessagePayload = {
                convoId: convo.id,
                message: {
                    text: this.message
                }
            }

            res = await this.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" });
            chatToken = res.data.token

            await sendMessageToConvo(sendMessagePayload, chatToken)
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
