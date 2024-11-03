import { HttpContext } from '@adonisjs/core/http'
import Account_bot_service from '#services/account_bot_service';
import Account from '#models/account';
import Listener from '#models/listener';
import crypto from "crypto"
export default class BotsController {
    public async addBot({ request, response, session, auth }: HttpContext) {
        try {
            await auth.authenticate()
            const { handle, event, action, wait_time, message } = request.only(['handle', 'event', 'action', "message", "wait_time"]);
            const account = await Account.findBy("bksy_social", handle)
            const id = crypto.randomBytes(6).toString('hex')
            if (account) {
                await Listener.create({
                    event: event,
                    action: action,
                    wait_time: wait_time,
                    message: message,
                    account_id: account.id,
                    id: id,
                })
                const bot_service = new Account_bot_service(account.id)
                await bot_service.addHandlerToMap(id)
                await bot_service.start(id)
                return response.redirect("/dashboard")
            }
        } catch (err) {
            console.log(err)
            session.flash("error", err)
        }

    }
    public async removeBot({ request, response, session, auth }: HttpContext) {
        try {
            await auth.authenticate()
            const { listener_id } = request.only(["listener_id"]);
            const listener = await Listener.find(listener_id)
            const account = listener?.account
            if (account) {
                const bot = new Account_bot_service(account?.id)
                bot.stop(listener_id)
                return response.redirect("/dashboard")
            }
        } catch (err) {
            console.log(err)
            session.flash("error", err)
        }
    }

    public async createBotFromListeners({ auth }: HttpContext) {
        const user = await auth.authenticate()
        const accounts = user.account
        for (let account of accounts) {
            const bot = new Account_bot_service(account?.id)
            await bot.startAllListener()
        }
    }
}