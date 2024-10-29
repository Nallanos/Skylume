import type { HttpContext } from '@adonisjs/core/http'
import BotService from '../utils/services/bot_service.js';
import Bot from '#models/bot';
import Account from '#models/account';
export type EventType = "Mention" | "Follow" | "Reply"
export default class BotsController {
    public async addBot({ request, response }: HttpContext) {
        const { handle, event, action, wait_time, message } = request.only(['handle', 'event', 'action', "message", "wait_time"]);
        await BotService.handleEventAction(handle, event, action, wait_time, message);
        const account = await Account.findBy("bksy_social", handle)
        if (account) {
            await Bot.create({ event: event, accountId: account.id, message: message, waitTime: wait_time, action: action },)
        }
        return response.redirect("/dashboard")
    }
}