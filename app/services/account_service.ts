import { AtpAgent } from '@atproto/api'
import type { MessageView } from "@atproto/api/dist/client/types/chat/bsky/convo/defs.js";
import type { MessagePayload, NotificationData } from '../bluesky/types.js';
import Account from '#models/account';
import type { AtpSessionData } from '@atproto/api';

export default class AccountService {
    public agent: AtpAgent;

    constructor(agent: AtpAgent) {
        this.agent = agent
    }

    public async getFollowing(actorHandle: string) {
        const res = await this.agent.getFollows({ actor: actorHandle })
        if (!res) throw new Error("Error while getting following")
        return res.data.follows
    }

    public async getFollowersCount(account: Account): Promise<number> {
        try {
            const res = await this.agent.getProfile({ actor: account.handle });
            if (!res) {
                throw new Error("getProfile response is undefined")
            }
            // Retourner 0 si followersCount est undefined ou null
            return res.data.followersCount || 0;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            console.error("Error while fetching followers count in the userBotService: ", err);
            // Retourne 0 en cas d'erreur pour éviter l'échec de la fonction
            return 0;
        }
    }

    public async getPostsCount(account: Account): Promise<number> {
        try {
            const res = await this.agent.getProfile({ actor: account.handle });
            if (!res) {
                throw new Error("getProfile response is undefined")
            }
            // Retourner 0 si postsCount est undefined ou null
            return res.data.postsCount || 0;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            console.error("Error while fetching posts count: ", err);
            // Retourne 0 en cas d'erreur pour éviter l'échec de la fonction
            return 0;
        }
    }

    public async calculateEngagementRate(account: Account): Promise<string> {
        try {
            const profile = await this.agent.getProfile({ actor: account.handle });
            if (!profile || !profile.data) {
                throw new Error("Profile data is undefined")
            }

            const followersCount = profile.data.followersCount || 0;
            if (followersCount === 0) return "0%";

            // Get recent posts to analyze engagement
            const feed = await this.agent.getAuthorFeed({ actor: account.handle, limit: 10 });
            if (!feed || !feed.data || !feed.data.feed || feed.data.feed.length === 0) {
                return "0%";
            }

            // Calculate average engagement (likes + reposts) per post
            let totalEngagement = 0;
            feed.data.feed.forEach(post => {
                totalEngagement += (post.post.likeCount || 0) + (post.post.repostCount || 0);
            });

            const avgEngagement = totalEngagement / feed.data.feed.length;
            // Calculate engagement rate as a percentage of followers
            const engagementRate = (avgEngagement / followersCount) * 100;

            return engagementRate.toFixed(1) + "%";
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            console.error("Error calculating engagement rate: ", err);
            return "0%";
        }
    }

    // Update account stats including followers count, posts count, and engagement rate in the database
    public async updateAccountStats(account: Account): Promise<void> {
        try {
            await this.createOrResumeSession(account);

            let profile, feed;
            try {
                profile = await this.agent.getProfile({ actor: account.handle });
                if (!profile || !profile.data) {
                    throw new Error("Profile data is undefined");
                }

                if (profile.data.followersCount && profile.data.followersCount > 0) {
                    feed = await this.agent.getAuthorFeed({ actor: account.handle, limit: 10 });
                }
            } catch (err) {
                await this.updateAccountRateLimit(account, err);
                console.error("Error fetching profile data: ", err);
                return;
            }

            const followersCount = profile.data.followersCount || 0;
            const postsCount = profile.data.postsCount || 0;

            // Calculate engagement rate
            let engagementRate = "0%";
            if (followersCount > 0 && feed && feed.data && feed.data.feed && feed.data.feed.length > 0) {
                let totalEngagement = 0;
                feed.data.feed.forEach(post => {
                    totalEngagement += (post.post.likeCount || 0) + (post.post.repostCount || 0);
                });

                const avgEngagement = totalEngagement / feed.data.feed.length;
                const engagementRateValue = (avgEngagement / followersCount) * 100;
                engagementRate = engagementRateValue.toFixed(1) + "%";
            }

            // Update account with new stats
            account.followers_count = followersCount;
            account.posts_count = postsCount;
            account.engagement_rate = engagementRate;

            await account.save();
            console.log(`Stats updated for ${account.handle}: ${followersCount} followers, ${postsCount} posts, ${engagementRate} engagement`);
        } catch (err) {
            console.error("Error updating account stats: ", err);
            // Don't throw error to prevent dashboard loading failure
        }
    }

    public async updateAccountRateLimit(account: Account, err?: any) {
        if (err) {
            if (err.message === "Rate Limit Exceeded") {
                account.isRateLimited = true
                await account.save()
                return "skip"
            }
        }
        else {
            account.isRateLimited = false
            await account.save()
        }
    }

    public async searchPosts(account: Account, query: string, cursor?: string) {
        try {
            const res = await this.agent.app.bsky.feed.searchPosts({
                q: query,
                limit: 100,
                cursor
            })
            if (!res) {
                throw new Error("searchPosts response is undefined")
            }
            let posts = res.data
            if (!posts || posts.length === 0) {
                throw new Error("posts is undefined")
            } else if (posts.cursor === undefined) {
                if (cursor) {
                    posts.cursor = (parseInt(cursor) - parseInt(cursor)).toString()
                } else {
                    throw new Error("cursor is undefined")
                }
            }
            await this.updateAccountRateLimit(account)
            return posts
        } catch (err) {
            throw new Error("Failed to search posts: " + err)
        }
    }

    public async replyToPost(account: Account, postUri: string, postCid: string, message: string) {
        try {
            await this.agent.post({
                text: message,
                reply: {
                    root: { uri: postUri, cid: postCid },
                    parent: { uri: postUri, cid: postCid }
                }
            })

        } catch (err) {
            await this.updateAccountRateLimit(account, err)
            throw new Error("Failed to reply to post: " + err)
        }
    }

    public async getAccountDid() {
        return this.agent.did
    }


    public async getMessages(
        account: Account,
        convoId: string,
        cursor?: string
    ): Promise<MessageView[] | undefined> {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                const authToken = await this.getMessagesToken(account)
                const params = new URLSearchParams()
                params.append('convoId', convoId)

                if (cursor) {
                    params.append('cursor', cursor)
                }

                const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getMessages?${params.toString()}`
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                        "atproto-Proxy": "did:web:api.bsky.chat"
                    }
                })

                const data = await response.json()

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized")
                    throw new Error(`HTTP error! Status: ${response.status}, error: ${JSON.stringify(data)}`)
                }

                await this.updateAccountRateLimit(account)
                return (data as any).messages
            } catch (error) {
                if (error.message === "Unauthorized" && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    console.error("Échec de la récupération des messages de la conversation", error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async getConvoFromMembers(
        account: Account,
        members: Array<string>
    ) {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                const convoToken = await this.getConvoToken(account)
                const params = new URLSearchParams()
                members.forEach(member => params.append('members', member))

                const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.getConvoForMembers?${params.toString()}`
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${convoToken}`,
                        "Content-Type": "application/json",
                        "atproto-Proxy": "did:web:api.bsky.chat"
                    }
                })

                const data = await response.json()

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized")
                    throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`)
                }

                await this.updateAccountRateLimit(account)
                return (data as any).convo
            } catch (error) {
                if (error.message === "Unauthorized" && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    console.error("Échec de la récupération de la conversation", error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async sendMessageToConvo(account: Account, payload: MessagePayload) {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                const chatToken = await this.getChatToken(account)
                const url = `https://api.bsky.chat/xrpc/chat.bsky.convo.sendMessage`
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
                })

                const data = await response.json()

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized")
                    throw new Error(`Erreur HTTP ! Statut : ${response.status}, error : ${JSON.stringify(data)}`)
                }

                await this.updateAccountRateLimit(account)
                return
            } catch (error) {
                if (error.message === "Unauthorized" && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    console.error("Erreur d'envoi de message", error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async followUser(account: Account, did: string): Promise<boolean> {
        try {
            console.log("in follow user")
            if (await this.updateAccountRateLimit(account) == "skip") return false;
            if (!account.at_session) throw new Error("session is not defined")
            const relationships = await this.agent.app.bsky.graph.getRelationships({ actor: account.at_session.did, others: [did] });
            if (relationships.data.relationships[0].following) {
                console.log("Already following user");
                return false
            }
            await this.agent.follow(did);
            console.log("followed user", did);
            return true
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async unfollowUser(account: Account, did: string): Promise<boolean> {
        try {
            if (await this.updateAccountRateLimit(account) == "skip") return false;
            if (!account.at_session) throw new Error("session is not defined")

            const relationships = await this.agent.app.bsky.graph.getRelationships({
                actor: account.at_session.did,
                others: [did]
            });

            const relationship = relationships.data.relationships[0]
            if (!relationship?.following) {
                console.log("Not following user");
                return false
            }

            await this.agent.deleteFollow(relationship.following as string);
            return true
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async getChatToken(account: Account) {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                if (!account.at_session) throw new Error("Session non définie")

                const res = await this.agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                )

                await this.updateAccountRateLimit(account)
                return res.data.token
            } catch (error) {
                if (error.status === 401 && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async getMessagesToken(account: Account) {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                if (!account.at_session) throw new Error("Session non définie")

                const res = await this.agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                )

                await this.updateAccountRateLimit(account)
                return res.data.token
            } catch (error) {
                if (error.status === 401 && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async getConvoToken(account: Account) {
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
            try {
                if (!account.at_session) throw new Error("Session non définie")

                const res = await this.agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                )

                await this.updateAccountRateLimit(account)
                return res.data.token
            } catch (error) {
                if (error.status === 401 && retries < maxRetries) {
                    await this.createOrResumeSession(account)
                    retries++
                } else {
                    await this.updateAccountRateLimit(account, error)
                    throw error
                }
            }
        }
        throw new Error("Échec après 3 tentatives")
    }

    public async createOrResumeSession(account: Account): Promise<void> {
        try {
            if (!this.agent) this.agent = new AtpAgent({ service: "https://bsky.social" });
            
            // Parse session data to determine authentication type
            let sessionData = null;
            if (account.session) {
                try {
                    sessionData = JSON.parse(account.session);
                } catch (e) {
                    console.error("Invalid session JSON for account:", account.handle);
                }
            }

            // Handle OAuth sessions
            if (sessionData?.type === 'oauth' && sessionData.accessToken) {
                console.log("Resuming OAuth session for account:", account.handle);
                try {
                    await this.agent.resumeSession({
                        accessJwt: sessionData.accessToken,
                        refreshJwt: sessionData.refreshToken || '',
                        did: sessionData.did,
                        handle: account.handle,
                        active: true
                    } as AtpSessionData);
                    
                    await this.updateAccountRateLimit(account);
                    return;
                } catch (err) {
                    console.log("OAuth session expired or invalid for:", account.handle);
                    // For now, throw error - in production you'd implement token refresh
                    throw new Error(`OAuth session invalid for ${account.handle}: ${err.message}`);
                }
            }
            
            // Handle app password sessions (existing logic)
            if (!this.agent.sessionManager.hasSession || !account.session) {
                if (!account.appPassword) {
                    throw new Error(`No authentication method available for ${account.handle}. Account needs either OAuth tokens or app password.`);
                }
                
                console.log("Creating new app password session for account:", account.handle);
                const session = (await this.agent.login({
                    identifier: account.handle,
                    password: account.appPassword,
                })).data;

                // Store as app password session
                account.session = JSON.stringify({ 
                    type: 'app_password', 
                    ...session 
                });
                await account.save();
            } else if (account.at_session) {
                console.log("Resuming app password session for account:", account.handle);
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
            // Fallback: try app password login if available
            if (account.appPassword) {
                try {
                    console.log("Failed to resume session, attempting new app password login for:", account.handle);
                    const session = (await this.agent.login({
                        identifier: account.handle,
                        password: account.appPassword,
                    })).data;

                    account.session = JSON.stringify({ 
                        type: 'app_password', 
                        ...session 
                    });
                    await account.save();
                    await this.updateAccountRateLimit(account);
                } catch (fallbackErr) {
                    await this.updateAccountRateLimit(account, fallbackErr);
                    console.error("All authentication methods failed for account:", account.handle, fallbackErr);
                    throw new Error(`Failed to authenticate account ${account.handle}: ${fallbackErr.message}`);
                }
            } else {
                await this.updateAccountRateLimit(account, err);
                console.error("Error while creating or resuming the session for account:", account.handle, err);
                throw new Error(`Failed to authenticate account ${account.handle} : ${err.message}`);
            }
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
            console.log("in get followers old cursor: ", cursor)
            const res = await this.agent.getFollowers({ actor: did, cursor: cursor, limit: 100 });
            console.log(`getting follower new cursor: ${res.data.cursor}`)
            await this.updateAccountRateLimit(account);
            return res.data;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async post(account: Account, message: string) {
        try {
            await this.agent.post({ text: message });
            await this.updateAccountRateLimit(account);
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    public async getProfile(actor: string) {
        try {
            const res = await this.agent.getProfile({ actor: actor });
            if (!res) {
                throw new Error("getProfile response is undefined")
            }
            return res.data;
        } catch (err) {
            throw err;
        }
    }

}