import { Job } from '@rlanz/bull-queue'
import Account from '#models/account';
import Listener from '#models/listener';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';

export default class BotJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  public async handle(account: Account) {
    const user_service = users_bot_service_manager.userbotServiceMap.get(account.userId)
    if (!user_service) {
      throw new Error("can't find the user_service")
    }
    const listeners = await Listener.findManyBy("account_id", account.id)
    await user_service.createOrResumeSession(account.id)
    const notificationData = await user_service.fetchAccountNotifications()
    await user_service.readAllNotification()
    if (!notificationData) {
      throw new Error(`Notification Data is undefined for the following account ${account.handle}`,)
    }
    await user_service.startAllListeners(notificationData, listeners)
  }

  /**
   * This is an optional method that gets called if it exists when the retries has exceeded and is marked failed.
   */
  public async rescue(payload: Account, error: Error) {
    console.log("max attempts for the job reached with :", payload, `error: ${error}`)
  }
}