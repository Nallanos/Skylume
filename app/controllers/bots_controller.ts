import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account';
import Listener from '#models/listener';
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';
import { generate } from 'random-words';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';
import BotConvo from '#models/listeners_convos';
import Convo from '#models/convo';
import { getConvoFromMembers } from '../bluesky/chatAPI.js';
import { getMessages, sendMessageToConvo } from '../bluesky/chatAPI.js'
import type { MessageViewSender } from '@atproto/api/dist/client/types/chat/bsky/convo/defs.js'
export default class BotsController {
    public async addBot({ request, response, session, auth }: HttpContext) {
        try {
            if (UsersBotServiceManager === undefined) {
                throw Error("UsersBotServiceManager is undefined")
            }
            const user = await auth.authenticate()
            const { handle, event, action, wait_time, message } = request.only(['handle', 'event', 'action', "message", "wait_time"]);
            const account = await Account.findBy("handle", handle)

            if (account === null) {
                throw new Error("no account found")
            }
            const word = generate({ exactly: 1, wordsPerString: 1, minLength: 5, maxLength: 10 })[0]
            if (!word) {
                throw new Error("error while generating a word with random-words")
            }
            await UsersBotServiceManager.initOneUserBotService(user.id)
            await Listener.create({
                event: event,
                action: action,
                wait_time: wait_time,
                message: message,
                account_id: account.id,
                user_id: user.id,
                id: word
            })

            return response.redirect(`/account/${account.id}/dashboard`)
        } catch (err) {
            console.log("error while adding a bot", err)
            session.flash("error", err)
        }

    }
    public async removeBot({ request, response, auth }: HttpContext) {
        try {
            if (UsersBotServiceManager == undefined) {
                throw Error("UsersBotServiceManager is undefined")
            }
            const user = await auth.authenticate()
            const { listener_id } = request.only(["listener_id"]);
            const listener = await Listener.find(listener_id)
            if (!listener) {
                throw new Error("no listener found with", listener_id)
            }

            let bot_service = UsersBotServiceManager.userbotServiceMap.get(user.id)
            if (!bot_service) {
                await UsersBotServiceManager.initOneUserBotService(user.id)
                bot_service = UsersBotServiceManager.userbotServiceMap.get(user.id)
                if (!bot_service) {
                    throw new Error(`no bot service found ${user.id}`)
                }
            }
            bot_service.stop(listener.id)
            await bot_service.removeHandlerFromMap(listener.id)
            await listener.delete()
            return response.redirect().back()
        } catch (err) {
            console.log("error while removing a bot", err)
            return response.redirect().back()
        }
    }

    public async refreshBotData({ request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                throw new Error("no user found")
            }
            const { listenerId } = request.only(["listenerId"]);

            const listener = await Listener.find(listenerId)

            if (!listener) {
                throw new Error(`cannot find listner with ${listenerId}`)
            }




            const listenerBotConvos = await BotConvo.findManyBy("listeners_convos.listeners_id", listenerId)

            let user_bot_service = users_bot_service_manager.userbotServiceMap.get(user.id)
            if (!user_bot_service) {
                await users_bot_service_manager.initOneUserBotService(user.id)
                user_bot_service = users_bot_service_manager.userbotServiceMap.get(user.id)
                if (!user_bot_service) {
                    throw new Error("no user bot service found")
                }
            }
            const account = await Account.find(listener.account_id)
            if (!account) {
                throw new Error(`cannot find account with ${listener.id}`)
            }

            await user_bot_service.createOrResumeSession(account)

            if (account.at_session != undefined) {
                let resAuth = await user_bot_service.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } })
                const chatToken = resAuth.data.token
                for (const botConvo of listenerBotConvos) {
                    let blueskyConvo = await getConvoFromMembers([botConvo.convoDid], chatToken)
                    if (!blueskyConvo) {
                        throw new Error(`errro while getting convo from members ${JSON.stringify(blueskyConvo)}`)
                    }

                    const dbListener = await Listener.find(botConvo.listeners_id)
                    const dbConvo = await Convo.find(blueskyConvo.id)

                    if (!dbListener) {
                        throw new Error(`can't find listener in the db with the following id: ${botConvo.listeners_id}`)
                    }

                    if (!dbConvo) {
                        throw new Error(`can't find convo in the db with the following id: ${botConvo.convoId}`)
                    }

                    const dateLatestMessage = new Date(blueskyConvo.lastMessage?.sentAt);

                    if (!dbConvo) {
                        throw new Error(`cannot find convo with ${botConvo.id}`)
                    }

                    const dateBotMessage = new Date(botConvo.last_message_sent_at);

                    console.log("dateLatestMessage", dateLatestMessage > dateBotMessage && blueskyConvo.lastMessage.sender.did !== account.did)

                    if (dateLatestMessage > dateBotMessage && blueskyConvo.lastMessage.sender.did !== account.did) {
                        dbListener.number_of_message_received++
                        await dbListener.save()
                        await botConvo.delete()
                    }
                }
            }


            return response.redirect().back()
        } catch (err) {
            console.log("error while refreshing bot data", err)
            return response.redirect().back()
        }
    }

    public async updateBot({ request, response, auth }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                throw new Error("no user found")
            }
            const { listenerId, message } = request.only(["listenerId", "message"]);

            const listener = await Listener.find(listenerId)

            if (!listener) {
                throw new Error(`cannot find listner with ${listenerId}`)
            }

            listener.message = message

            await listener.save()

            return response.redirect().back()
        } catch (err) {
            console.log("error while updating bot", err)
            return response.redirect().back()
        }
    }

    public async sendMessageToAllFollowers({ request, response, auth, session }: HttpContext) {
        const user = auth.user;
        if (!user) throw new Error("No user found");

        const userBotService = users_bot_service_manager.userbotServiceMap.get(user.id);
        if (!userBotService) throw new Error("User bot service not found");

        const { account_id, listener_id } = request.only(["account_id", "listener_id"]);
        const [account, listener] = await Promise.all([
            Account.find(account_id),
            Listener.find(listener_id)
        ]);


        if (!account || !listener) throw new Error("Account or listener not found");
        if (!account.at_session) throw new Error("Account session missing");

        await this.refreshListenerStatus(listener, true)
        const agent = userBotService.agent;

        // Fonction de rafraîchissement de session et d'authentifications
        const refreshSessionAndAuths = async () => {
            await userBotService.createOrResumeSession(account);
            await account.refresh();

            if (!account.at_session) throw new Error("Account session missing")

            return Promise.all([
                agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                ),
                agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getMessages" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                ),
                agent.com.atproto.server.getServiceAuth(
                    { aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.sendMessage" },
                    { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } }
                )
            ]);
        };

        // Initialisation des authentifications
        let [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();

        // Vérification d'expiration JWT
        const isJwtExpired = (token: string) => {
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                return payload.exp * 1000 < Date.now() + 5000; // Marge de sécurité de 5s
            } catch {
                return true;
            }
        };

        // Wrapper de réessai automatique
        const withRetry = async (fn: () => Promise<any>, context: string) => {
            try {
                return await fn();
            } catch (err) {
                if (err.message.includes('JwtExpired')) {
                    console.log(`JWT expiré détecté (${context}), tentative de rafraîchissement...`);
                    [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();
                    return await fn();
                }
                throw err;
            }
        };

        let cursor: string | undefined;
        if (listener.followersCursor) cursor = listener.followersCursor
        try {
            while (true) {
                const followersResponse = await agent.getFollowers({
                    actor: account.handle,
                    limit: 100,
                    cursor
                });

                if (!followersResponse.data.followers.length) break;

                for (const follow of followersResponse.data.followers) {
                    try {
                        console.log("Processing account:", follow.handle)
                        if (isJwtExpired(account.at_session.accessJwt)) {
                            [convoAuth, messagesAuth, sendMessageAuth] = await refreshSessionAndAuths();
                        }

                        const convo = await withRetry(
                            () => getConvoFromMembers([account.did, follow.did], convoAuth.data.token),
                            'getConvoFromMembers'
                        );

                        if (convo) {
                            const messages = await withRetry(
                                () => getMessages(convo.id, messagesAuth.data.token),
                                'getMessages'
                            ) as unknown as MessageViewSender[];

                            console.log(messages.length === 0)
                            if (messages.length === 0) {
                                await withRetry(
                                    () => sendMessageToConvo(
                                        { convoId: convo.id, message: { text: listener.message } },
                                        sendMessageAuth.data.token
                                    ),
                                    'sendMessageToConvo'
                                );
                                listener.number_of_message_sent++
                                listener.save()
                                console.log("Message sent to", follow.handle);

                                await new Promise(resolve => setTimeout(resolve, 1500));
                            }
                        }
                    } catch (err) {
                        console.error("error catché avec", err.statusCode)
                        if (err.statusCode === 429) {
                            const retryAfter = err.response?.headers?.['retry-after'] || 60;
                            console.log(`Rate limit (${retryAfter}s)`);
                            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                            continue;
                        }
                        console.error(`Erreur avec ${follow.handle}:`, err.message);
                    }
                }

                cursor = followersResponse.data.cursor;
                listener.followersCursor = cursor
                await listener.save()
                console.log("Cursor updated")
                if (!cursor) {
                    await this.refreshListenerStatus(listener, false)
                    break;
                }

                // Délai entre les pages
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            await this.refreshListenerStatus(listener, false)
            console.error("Erreur globale:", error);
            session.flash('error', 'Erreur: ' + error.message);
            return response.redirect().back();
        }

        session.flash('success', 'Messages envoyés avec succès');
        return response.redirect().back();
    }

    private async refreshListenerStatus(listener: Listener, boolean: boolean) {
        listener.state_send_to_all = boolean
        await listener.save()
        console.warn(`updated listener status ${listener.state_send_to_all}`)
    }

}