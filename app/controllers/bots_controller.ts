import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account';
import Listener from '#models/listener';
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';
import { generate } from 'random-words';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';
import BotConvo from '#models/listeners_convos';
import Convo from '#models/convo';
import { getConvoFromMembers } from '../bluesky/chatAPI.js';
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

            return response.redirect("/dashboard")
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
            if (!account?.at_session && account) {
                await user_bot_service.createOrResumeSession(account)
            } else if (!account) {
                throw new Error(`no account found for the listener ${account} `)
            }

            if (account.at_session != undefined) {
                let resAuth = await user_bot_service.agent.com.atproto.server.getServiceAuth({ aud: "did:web:api.bsky.chat", lxm: "chat.bsky.convo.getConvoForMembers" }, { headers: { Authorization: `Bearer ${account.at_session.accessJwt}` } })
                const chatToken = resAuth.data.token
                for (const botConvo of listenerBotConvos) {
                    const blueskyConvo = await getConvoFromMembers([botConvo.convoDid], chatToken)

                    const dbListener = await Listener.find(botConvo.listeners_id)
                    const dbConvo = await Convo.find(blueskyConvo.id)

                    if (!dbListener) {
                        throw new Error(`can't find listener in the db with the following id: ${botConvo.listeners_id}`)
                    }

                    if (!dbConvo) {
                        throw new Error(`can't find convo in the db with the following id: ${botConvo.convoId}`)
                    }

                    const dateLatestMessage = new Date(blueskyConvo.lastMessage.sentAt);

                    if (!dbConvo) {
                        throw new Error(`cannot find convo with ${botConvo.id}`)
                    }

                    const dateBotMessage = new Date(botConvo.last_message_sent_at);

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
}