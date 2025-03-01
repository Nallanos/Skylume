import type { MessagePayload } from "./types.js";
import Account from "#models/account";
import { AtpAgent } from "@atproto/api";
import Listener from "#models/listener";
import Convo from "#models/convo";
import BotConvo from "#models/listeners_convos";
import AccountService from "#services/account_service";
export class EventListener {
    protected accountService: AccountService;
    constructor(
        private agent: AtpAgent,
        private event: string,
        public action: string,
        public listener_id: string,
        private account_id: string,
        private message?: string,
    ) {
        this.accountService = new AccountService(this.agent)
    }

    async on(did: string, account: Account): Promise<void> {
        try {
            await this.accountService.updateAccountRateLimit(account)

            if (account.isRateLimited) {
                console.warn("Account is rate limited, skipping event")
                return
            }
            if (this.event === "follow" || this.event === "like" || this.event === "mention" || this.event === "reply") {
                if (this.action === "Send a Message" && this.message) {
                    await this.sendMessage(did);
                } else if (this.action === "Follow") {
                    await this.accountService.followUser(account, did);
                }
            }
        } catch (err) {
            await this.accountService.updateAccountRateLimit(account, err)
            console.log("account.isRateLimited", account.isRateLimited)
        }
    }

    public async sendMessage(authorDid: string): Promise<void> {
        try {
            const account = await this.getAccount();
            const listener = await this.getListener();

            const chatToken = await this.accountService.getChatToken(account);
            const convoToken = await this.accountService.getConvoToken(account)
            const messageToken = await this.accountService.getMessagesToken(account)

            const convo = await this.getConvo(authorDid, convoToken, account);

            await this.updateConvo(listener, convo, authorDid);

            const res = await this.accountService.getMessages(account, convo.id, messageToken, 100)
            if (!res) throw new Error("error while getting messages")
            console.log(res)
            const isAlreadySent = res.length > 0 && res.some(msg => msg.text === this.message);
            console.log(isAlreadySent)

            const sendMessagePayload: MessagePayload = {
                convoId: convo.id,
                message: { text: this.message || '' }
            };
            if (!isAlreadySent) {
                this.accountService.sendMessageToConvo(account, sendMessagePayload, chatToken).then(async () => {
                    listener.number_of_message_sent++;
                    await listener.save();
                });
            }
        } catch (err) {
            console.log("error while sending message on follow:", err);
        }
    }

    private async getAccount() {
        const account = await Account.find(this.account_id);
        if (!account) {
            throw new Error(`can't find account with the following account_id: ${this.account_id}`);
        }
        if (account.at_session?.handle === undefined) {
            throw new Error("handle is undefined");
        }
        return account;
    }

    private async getListener() {
        const listener = await Listener.find(this.listener_id);
        if (!listener) {
            throw new Error(`can't find listener with the following listener_id: ${this.listener_id}`);
        }
        return listener;
    }

    private async getConvo(authorDid: string, chatToken: string, account: Account) {
        const convo = await this.accountService.getConvoFromMembers(account, [authorDid], chatToken);
        if (!convo) {
            throw new Error("convos is undefined");
        }
        return convo;
    }

    private async updateConvo(listener: any, convo: any, authorDid: string) {
        const DbBotConvo = await BotConvo.query().where("listeners_convos.listeners_id", listener.id).where("listeners_convos.convo_id", convo.id).first();
        const now = new Date();
        if (!DbBotConvo) {
            const newConvo = await Convo.findBy("id", convo.id);
            if (!newConvo) {
                console.log(`creating convo with id: ${convo.id}`);
                await Convo.create({ id: convo.id, did: authorDid });
                await BotConvo.create({ listeners_id: listener.id, convoId: convo.id, last_message_sent_at: new Date(now.getTime() + 20 * 1000).toISOString(), convoDid: authorDid });
            } else {
                await BotConvo.create({ listeners_id: listener.id, convoId: convo.id, last_message_sent_at: new Date(now.getTime() + 20 * 1000).toISOString(), convoDid: authorDid });
            }
        } else {
            const convo = await Convo.find(DbBotConvo.convoId);
            if (!convo) {
                throw new Error(`Cannot find the convo, linked with the following botConvo ${JSON.stringify(DbBotConvo)}`);
            }
            DbBotConvo.last_message_sent_at = new Date(now.getTime() + 20 * 1000).toISOString();
            console.log(`updated DbBotConvo with following id: ${DbBotConvo.id}`);
            await DbBotConvo.save();
        }
    }
}
