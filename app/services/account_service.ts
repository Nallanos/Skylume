import { AtpAgent } from '@atproto/api'
import type { MessageView } from "@atproto/api/dist/client/types/chat/bsky/convo/defs.js";
import type { MessagePayload, NotificationData } from '../bluesky/types.js';
import Account from '#models/account';
import type { AtpSessionData } from '@atproto/api';

export default class AccountService {
    private agent: AtpAgent

    constructor(agent: AtpAgent) {
        this.agent = agent
    }

    public async updateAccountRateLimit(account: Account, err?: any) {
        if (err) {
            if (err && err.message === "Rate Limit Exceeded") {
                account.isRateLimited = true
                await account.save()
                return "skip"
            } else if (err) {
                throw new Error(err.message)
            }
        }
        else {
            account.isRateLimited = false
            await account.save()
        }
    }

    public async getAccountDid() {
        return this.agent.did
    }

    public async getMessages(
        account: Account,
        convoId: string,
        authToken: string,
        limit: number = 50,
        cursor?: string
    ): Promise<MessageView[] | undefined> {
        try {
            const params = new URLSearchParams();
            params.append('convoId', convoId);

            const processedLimit = Math.min(Math.max(limit, 1), 100);
            params.append('limit', processedLimit.toString());

            if (cursor) {
                params.append('cursor', cursor);
            }

            const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getMessages?${params.toString()}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                    "atproto-Proxy": "did:web:api.bsky.chat"
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, error: ${JSON.stringify(data)}`);
            }

            await this.updateAccountRateLimit(account);
            return data.messages;
        } catch (error) {
            await this.updateAccountRateLimit(account, error);
            console.error("Échec de la récupération des messages de la conversation", error);
            throw error;
        }
    }

    public async getConvoFromMembers(
        account: Account,
        members: Array<string>,
        authToken: string
    ) {
        try {
            const params = new URLSearchParams();
            members.forEach(member => params.append('members', member));
            const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getConvoForMembers?${params.toString()}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                    "atproto-Proxy": "did:web:api.bsky.chat"
                }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`);
            }

            await this.updateAccountRateLimit(account);
            return data.convo;
        } catch (error) {
            await this.updateAccountRateLimit(account, error);
            console.error("Échec de la récupération de la conversation à partir des membres", error);
            throw error;
        }
    }

    public async sendMessageToConvo(account: Account, payload: MessagePayload, chatToken: string) {
        try {
            const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.sendMessage`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${chatToken}`,
                    "Content-Type": "application/json",
                    "atproto-Proxy": "did:web:api.bsky.chat"
                },
                body: JSON.stringify({
                    convoId: payload.convoId,
                    message: payload.message
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`);
            }
        } catch (error) {
            await this.updateAccountRateLimit(account, error);
            console.error("Error:", error);
            throw error;
        }
    }

    public async followUser(account: Account, did: string): Promise<void> {
        try {
            console.log("in follow user")
            if (await this.updateAccountRateLimit(account) == "skip") return;
            if (!account.at_session) throw new Error("session is not defined")
            const relationships = await this.agent.app.bsky.graph.getRelationships({ actor: account.at_session.did, others: [did] });
            if (relationships.data.relationships[0].following) {
                console.log("Already following user");
                return
            }
            await this.agent.follow(did);
            console.log("followed user", did);
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async getChatToken(account: Account) {
        try {
            if (!account.at_session) throw new Error("session is not defined")
            let res = await this.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } });
            await this.updateAccountRateLimit(account);
            return res.data.token;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async getMessagesToken(account: Account) {
        try {
            if (!account.at_session) throw new Error("session is not defined")
            let res = await this.agent.com.atproto.server.getServiceAuth({
                aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages"
            }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } });
            await this.updateAccountRateLimit(account);
            return res.data.token;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async getConvoToken(account: Account) {
        try {
            if (!account.at_session) throw new Error("session is not defined")
            let res = await this.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } });
            await this.updateAccountRateLimit(account);
            return res.data.token;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async createOrResumeSession(account: Account): Promise<void> {
        try {
            if (!this.agent) this.agent = new AtpAgent({ service: "https://bsky.social" });
            if (!this.agent.sessionManager.hasSession || !account.session) {
                console.log("account", account.handle, account.appPassword);
                const session = (await this.agent.login({
                    identifier: account.handle,
                    password: account.appPassword,
                })).data;

                account.session = JSON.stringify(session);
                await account.save();
            } else if (account.at_session) {
                await this.agent.resumeSession({
                    accessJwt: account.at_session.accessJwt,
                    refreshJwt: account.at_session.refreshJwt,
                    handle: account.handle,
                    did: account.at_session.did,
                } as AtpSessionData);
            }
            await this.updateAccountRateLimit(account);
            return;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            console.error("Error while creating or resuming the session in the userBotService:", err);
            throw err;
        }
    }

    public async fetchAccountNotifications(account: Account): Promise<NotificationData[] | undefined> {
        try {
            const response = await this.agent.listNotifications();
            if (!response) {
                throw new Error("list notification response is undefined");
            }
            const newNotification = response.data.notifications.filter((notification) => new Date(notification.indexedAt) > new Date(account.seenNotificationAt));
            await this.updateAccountRateLimit(account);
            return newNotification.map((notification) => ({
                authorDid: notification.author.did,
                event: notification.reason,
                indexedAt: notification.indexedAt
            }));
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            console.error("Error while fetching Account Notifications in the userBotService: ", err);
            return undefined;
        }
    }

    public async getFollowers(account: Account, did: string, cursor?: string) {
        try {
            const res = await this.agent.getFollowers({ actor: did, cursor: cursor });
            await this.updateAccountRateLimit(account);
            return res.data;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }
}