import { AtpAgent } from '@atproto/api'
import type { MessageView } from "@atproto/api/dist/client/types/chat/bsky/convo/defs.js";
import type { MessagePayload, NotificationData } from '../bluesky/types.js';
import Account from '#models/account';
import type { AtpSessionData } from '@atproto/api';
import { imageSize } from 'image-size';

// Interfaces pour les posts avec images, vidéos et labels
interface PostImage {
  file: Buffer;
  alt: string;
  mimeType?: string;
}

interface PostVideo {
  file: Buffer;
  alt: string;
  mimeType?: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
  captions?: {
    lang: string;
    file: Buffer;
  }[];
}

interface ImageBlob {
  ref: { $link: string };
  mimeType: string;
  size: number;
}

interface VideoBlob {
  ref: { $link: string };
  mimeType: string;
  size: number;
}

interface PostOptions {
  text: string;
  images?: PostImage[];
  videos?: PostVideo[];
  labels?: string[]; // "porn", "nudity", "sexual", "graphic-media", etc.
  facets?: any[]; // Rich text facets for Bluesky
}

type ContentWarningType = 'porn' | 'nudity' | 'sexual' | 'graphic-media' | 'gore';

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

    public async post(account: Account, message: string, images?: string[], altTexts?: string[], contentWarnings?: string[], facets?: any[]) {
        try {
            console.log('[DEBUG] AccountService.post() - Legacy method called, forwarding to new implementation')
            console.log('  - message:', message)
            console.log('  - images:', images)
            console.log('  - altTexts:', altTexts)
            console.log('  - contentWarnings:', contentWarnings)
            console.log('  - facets:', facets?.length || 0, 'rich text facets')
            
            // Convert legacy contentWarnings to new ContentWarningType format
            const mappedWarnings: ContentWarningType[] = [];
            if (contentWarnings && contentWarnings.length > 0) {
                const warningMap: { [key: string]: ContentWarningType } = {
                    'adult': 'porn',
                    'suggestive': 'sexual',
                    'nudity': 'nudity',
                    'graphic-media': 'graphic-media',
                    'graphic_media': 'graphic-media',
                    'sexual': 'sexual',
                    'gore': 'gore'
                };
                
                contentWarnings.forEach(warning => {
                    const mapped = warningMap[warning];
                    if (mapped) {
                        mappedWarnings.push(mapped);
                    }
                });
            }
            
            // Use the new postWithImagePaths method for better code reuse
            if (images && images.length > 0) {
                return await this.postWithImagePaths(
                    account,
                    message,
                    images,
                    altTexts || [],
                    mappedWarnings.length > 0 ? mappedWarnings : undefined,
                    facets
                );
            } else {
                // For text-only posts, use createPostWithMedia
                return await this.createPostWithMedia(account, {
                    text: message,
                    labels: mappedWarnings.length > 0 ? mappedWarnings : undefined,
                    facets: facets || undefined
                });
            }
        } catch (err) {
            console.error('[ERROR] Legacy post method failed:', err);
            throw err;
        }
    }

    /**
     * Upload d'une image vers Bluesky (blob)
     */
    private async uploadImage(image: PostImage): Promise<ImageBlob> {
        const mimeType = image.mimeType || this.detectMimeType(image.file);
        
        console.log(`[DEBUG] Uploading image with mimeType: ${mimeType}`);
        
        const uploadResponse = await this.agent.uploadBlob(image.file, {
            encoding: mimeType
        });
        
        console.log(`[DEBUG] Image uploaded successfully:`, uploadResponse.data.blob);
        return uploadResponse.data.blob;
    }

    /**
     * Upload d'une vidéo vers Bluesky (blob)
     */
    private async uploadVideo(video: PostVideo): Promise<VideoBlob> {
        const mimeType = video.mimeType || this.detectVideoMimeType(video.file);
        
        console.log(`[DEBUG] Uploading video with mimeType: ${mimeType}, size: ${video.file.length} bytes`);
        
        const uploadResponse = await this.agent.uploadBlob(video.file, {
            encoding: mimeType
        });
        
        console.log(`[DEBUG] Video uploaded successfully:`, uploadResponse.data.blob);
        return uploadResponse.data.blob;
    }

    /**
     * Détection du MIME type basique à partir du buffer
     */
    private detectMimeType(buffer: Buffer): string {
        // Détection basique basée sur les premiers bytes
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
        if (buffer[0] === 0x57 && buffer[1] === 0x45 && buffer[2] === 0x42 && buffer[3] === 0x50) return 'image/webp';
        
        // Fallback
        return 'image/jpeg';
    }

    /**
     * Détection du MIME type vidéo basique à partir du buffer
     */
    private detectVideoMimeType(buffer: Buffer): string {
        // Détection basique basée sur les premiers bytes
        if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
            // MP4 container
            return 'video/mp4';
        }
        if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
            // WebM container
            return 'video/webm';
        }
        
        // Fallback
        return 'video/mp4';
    }

    /**
     * Création d'un post avec images et labels de contenu
     */
    public async createPostWithMedia(account: Account, options: PostOptions): Promise<any> {
        try {
            console.log('[DEBUG] AccountService.createPostWithMedia() called with:', options);
            
            await this.createOrResumeSession(account);
            
            // Upload des images si présentes
            const uploadedImages = [];
            if (options.images && options.images.length > 0) {
                console.log(`[DEBUG] Processing ${options.images.length} images`);
                
                for (const image of options.images) {
                    try {
                        const blob = await this.uploadImage(image);
                        
                        // Get image dimensions for aspectRatio
                        const dimensions = imageSize(image.file);
                        console.log(`[DEBUG] Image dimensions:`, dimensions);
                        
                        uploadedImages.push({
                            alt: image.alt,
                            aspectRatio: {
                                width: dimensions.width || 1920,
                                height: dimensions.height || 1080
                            },
                            image: blob
                        });
                    } catch (imageErr) {
                        console.error(`[ERROR] Failed to upload image:`, imageErr);
                        // Continue with other images
                    }
                }
            }

            // Upload des vidéos si présentes
            const uploadedVideos = [];
            if (options.videos && options.videos.length > 0) {
                console.log(`[DEBUG] Processing ${options.videos.length} videos`);
                
                for (const video of options.videos) {
                    try {
                        const blob = await this.uploadVideo(video);
                        
                        uploadedVideos.push({
                            alt: video.alt,
                            aspectRatio: video.aspectRatio || {
                                width: 1920,
                                height: 1080
                            },
                            video: blob,
                            captions: video.captions || []
                        });
                    } catch (videoErr) {
                        console.error(`[ERROR] Failed to upload video:`, videoErr);
                        // Continue with other videos
                    }
                }
            }

            // Construction du record
            const postRecord: any = {
                $type: 'app.bsky.feed.post',
                text: options.text,
                createdAt: new Date().toISOString(),
            };

            // ✅ NOUVEAU: Ajout des facets rich text si présents
            if (options.facets && options.facets.length > 0) {
                postRecord.facets = options.facets;
                console.log(`[DEBUG] Adding ${options.facets.length} rich text facets to post:`, JSON.stringify(postRecord.facets, null, 2));
            }

            // Ajout des images si présentes (et pas de vidéos)
            if (uploadedImages.length > 0 && uploadedVideos.length === 0) {
                postRecord.embed = {
                    $type: 'app.bsky.embed.images',
                    images: uploadedImages,
                };
                console.log(`[DEBUG] Final image embed object:`, JSON.stringify(postRecord.embed, null, 2));
            }
            
            // Ajout des vidéos si présentes (priorité sur les images)
            if (uploadedVideos.length > 0) {
                const videoData = uploadedVideos[0];
                postRecord.embed = {
                    $type: 'app.bsky.embed.video',
                    video: videoData.video, // Directement la blob ref
                    alt: videoData.alt,
                    aspectRatio: videoData.aspectRatio,
                    captions: videoData.captions
                };
                console.log(`[DEBUG] Final video embed object:`, JSON.stringify(postRecord.embed, null, 2));
            }

            // Ajout des labels de contenu si présents
            if (options.labels && options.labels.length > 0) {
                postRecord.labels = {
                    $type: 'com.atproto.label.defs#selfLabels',
                    values: options.labels.map(label => ({ val: label })),
                };
                console.log(`[DEBUG] Final labels object:`, JSON.stringify(postRecord.labels, null, 2));
            }

            console.log('[DEBUG] Complete post record before sending to Bluesky:', JSON.stringify(postRecord, null, 2));

            // Envoi du post
            const result = await this.agent.api.com.atproto.repo.createRecord({
                repo: this.agent.session?.did || '',
                collection: 'app.bsky.feed.post',
                record: postRecord
            });

            console.log('[DEBUG] Bluesky createRecord response:', result);
            console.log('[DEBUG] Post successfully sent to Bluesky');
            
            await this.updateAccountRateLimit(account);
            return result;
        } catch (err) {
            await this.updateAccountRateLimit(account, err);
            throw err;
        }
    }

    /**
     * Fonction helper pour poster du contenu NSFW avec warning
     */
    public async postNSFWContent(
        account: Account,
        text: string,
        images: PostImage[],
        contentType: ContentWarningType = 'porn'
    ): Promise<any> {
        console.log(`[DEBUG] Posting NSFW content with type: ${contentType}`);
        
        return this.createPostWithMedia(account, {
            text,
            images,
            labels: [contentType],
        });
    }

    /**
     * Fonction helper pour poster du contenu normal (sans warning)
     */
    public async postSafeContent(account: Account, text: string, images?: PostImage[]): Promise<any> {
        console.log(`[DEBUG] Posting safe content`);
        
        return this.createPostWithMedia(account, {
            text,
            images,
        });
    }

    /**
     * Fonction helper pour créer un post avec des images depuis des chemins de fichiers
     */
    public async postWithImagePaths(
        account: Account, 
        text: string, 
        imagePaths: string[], 
        altTexts: string[] = [], 
        contentWarnings?: ContentWarningType[],
        facets?: any[]
    ): Promise<any> {
        try {
            console.log('[DEBUG] Creating post with image paths:', imagePaths);
            
            const fs = await import('fs');
            const path = await import('path');
            
            // Convertir les chemins d'images en PostImage objects
            const images: PostImage[] = [];
            
            for (let i = 0; i < imagePaths.length; i++) {
                const imagePath = imagePaths[i];
                const altText = altTexts[i] || '';
                
                const fullImagePath = path.join(process.cwd(), 'public', imagePath);
                console.log(`[DEBUG] Processing image: ${fullImagePath}`);
                
                if (fs.existsSync(fullImagePath)) {
                    const imageBuffer = fs.readFileSync(fullImagePath);
                    
                    images.push({
                        file: imageBuffer,
                        alt: altText,
                        mimeType: this.detectMimeType(imageBuffer)
                    });
                } else {
                    console.error(`[ERROR] Image file not found: ${fullImagePath}`);
                }
            }
            
            // Utiliser createPostWithMedia avec les images converties
            return this.createPostWithMedia(account, {
                text,
                images,
                labels: contentWarnings,
                facets: facets || undefined
            });
            
        } catch (err) {
            console.error('[ERROR] Failed to create post with image paths:', err);
            throw err;
        }
    }

    /**
     * Fonction helper pour créer un post avec des vidéos depuis des chemins de fichiers
     */
    public async postWithVideoPaths(
        account: Account,
        text: string,
        videoPaths: string[],
        videoAltTexts: string[] = [],
        contentWarnings?: ContentWarningType[],
        facets?: any[]
    ): Promise<any> {
        try {
            console.log('[DEBUG] Creating post with video paths:', videoPaths);
            
            const fs = await import('fs');
            const path = await import('path');
            
            // Convertir les chemins de vidéos en PostVideo objects
            const videos: PostVideo[] = [];
            
            for (let i = 0; i < videoPaths.length; i++) {
                const videoPath = videoPaths[i];
                const altText = videoAltTexts[i] || '';
                
                const fullVideoPath = path.join(process.cwd(), 'public', videoPath);
                console.log(`[DEBUG] Processing video: ${fullVideoPath}`);
                
                if (fs.existsSync(fullVideoPath)) {
                    const videoBuffer = fs.readFileSync(fullVideoPath);
                    
                    videos.push({
                        file: videoBuffer,
                        alt: altText,
                        mimeType: this.detectVideoMimeType(videoBuffer)
                    });
                } else {
                    console.error(`[ERROR] Video file not found: ${fullVideoPath}`);
                }
            }
            
            // Utiliser createPostWithMedia avec les vidéos converties
            return this.createPostWithMedia(account, {
                text,
                videos,
                labels: contentWarnings,
                facets: facets || undefined
            });
            
        } catch (err) {
            console.error('[ERROR] Failed to create post with video paths:', err);
            throw err;
        }
    }

    /**
     * Fonction helper pour créer un post avec des médias mixtes (images ET/OU vidéos)
     */
    public async postWithMixedMedia(
        account: Account,
        text: string,
        imagePaths: string[] = [],
        videoPaths: string[] = [],
        imageAltTexts: string[] = [],
        videoAltTexts: string[] = [],
        contentWarnings?: ContentWarningType[]
    ): Promise<any> {
        try {
            console.log('[DEBUG] Creating post with mixed media:', { images: imagePaths.length, videos: videoPaths.length });
            
            // Si il y a des vidéos, utiliser seulement les vidéos (limitation Bluesky)
            if (videoPaths.length > 0) {
                return this.postWithVideoPaths(account, text, videoPaths, videoAltTexts, contentWarnings);
            }
            
            // Sinon utiliser les images
            if (imagePaths.length > 0) {
                return this.postWithImagePaths(account, text, imagePaths, imageAltTexts, contentWarnings);
            }
            
            // Post texte seul
            return this.createPostWithMedia(account, {
                text,
                labels: contentWarnings
            });
            
        } catch (err) {
            console.error('[ERROR] Failed to create post with mixed media:', err);
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