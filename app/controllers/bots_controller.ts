import { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account';
import Listener from '#models/listener';
import crypto from "crypto"
import UsersBotServiceManager from '../bluesky/users_bot_service_manager.js';

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

            const id = crypto.randomBytes(6).toString('hex')
            const listener = await Listener.create({
                event: event,
                action: action,
                wait_time: wait_time,
                message: message,
                account_id: account.id,
                id: id,
                user_id: user.id,
            })

            let bot_service = UsersBotServiceManager.userbotServiceMap.get(user.id)
            if (!bot_service) {
                throw new Error("can't find users service in the user bot service manager")
            }
            await bot_service.addHandlerToMap(listener.id)
            return response.redirect("/dashboard")
        } catch (err) {
            console.log("error while adding a bot", err)
            session.flash("error", err)
        }

    }
    public async removeBot({ request, response, session, auth }: HttpContext) {
        try {
            if (UsersBotServiceManager == undefined) {
                throw Error("UsersBotServiceManager is undefined")
            }
            const user = await auth.authenticate()
            const { listener_id } = request.only(["listener_id"]);
            const listener = await Listener.find(listener_id)
            if (listener) {
                const bot_service = UsersBotServiceManager.userbotServiceMap.get(user.id)
                if (bot_service) {
                    bot_service.stop(listener_id)
                    bot_service.removeHandlerFromMap(listener_id)
                    listener.delete()
                    return response.redirect("/dashboard")
                }
                return response.redirect().back()
            }
        } catch (err) {
            console.log(err)
            session.flash("error", err)
        }
    }
}