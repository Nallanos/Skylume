import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account';
import Listener from '#models/listener';
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';
import { generate } from 'random-words';
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

            console.log(UsersBotServiceManager.userbotServiceMap)
            const bot_service = UsersBotServiceManager.userbotServiceMap.get(user.id)
            if (!bot_service) {
                throw new Error(`no bot service found ${user.id}`)
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

    public async editBotName() {

    }
}