import EventActionMapper from '../utils/EventActionMapper.js';
import Account from '#models/account';
import { Bot } from "@skyware/bot"

class BotService {
    private static async loginToAccount(handle: string) {
        const account = await Account.findBy('bksy_social', handle);
        if (account) {
            const bot = new Bot();
            await bot.login({
                identifier: account.did,
                password: account.app_password,
            });
            return bot;
        }
        throw new Error('Account not found');
    }

    public static async handleEventAction(handle: string, event: string, action: string, waitTime: number, messageContent?: string) {
        const bot = await this.loginToAccount(handle);
        if (action === 'Send a Message') {
            console.log("mapping event with message")
            EventActionMapper.mapEventToAction(bot, event, action, waitTime, messageContent);
            return
        }
        console.log("mapping event without message")
        EventActionMapper.mapEventToAction(bot, event, action, waitTime);
    }
}

export default BotService;
