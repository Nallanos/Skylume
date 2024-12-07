import { Job } from '@rlanz/bull-queue'
import Account from '#models/account';
import Listener from '#models/listener';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';
import type { NotificationData } from '../bluesky/types.js';

interface botJobPayload {
  account_id: string
}
export default class BotJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  public async handle(data: botJobPayload) {
    try {
      console.log(data.account_id)
      let accountWithMethod = await Account.find(data.account_id);

      if (!accountWithMethod) {
        throw new Error(`Account not found for ID: ${data.account_id}`);
      }
      console.log(`[INFO] Processing account ID: ${accountWithMethod.id}, handle: ${accountWithMethod.handle}`);
      let user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
      if (!user_service) {
        await users_bot_service_manager.initAllUsersBotService()
        user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
        if (!user_service) {
          throw new Error(`User service not found for userId: ${accountWithMethod.userId}`);
        }
      }
      await user_service.initializeMapHandler()


      const listeners = await Listener.findManyBy("account_id", accountWithMethod.id);

      await user_service.createOrResumeSession(accountWithMethod);

      let notificationData: NotificationData[] | undefined = [];
      console.log(accountWithMethod.seenNotificationAt)
      notificationData = await user_service.fetchAccountNotifications(accountWithMethod);
      if (!notificationData) {
        console.warn(`[WARN] No notifications found for account: ${accountWithMethod.handle}`);
        return;
      }
      console.log("read notifiation at", accountWithMethod.seenNotificationAt)
      accountWithMethod.seenNotificationAt = new Date().toISOString()
      await accountWithMethod.save()
      console.log("readed notifiation at", accountWithMethod.seenNotificationAt)

      await user_service.startAllListeners(notificationData, listeners);
    } catch (err) {
      console.error("[ERROR] Error in botJob:", err);
    }
  }


  /**
   * This is an optional method that gets called if it exists when the retries has exceeded and is marked failed.
   */
  public async rescue(payload: Account, error: Error) {
    console.log("max attempts for the job reached with :", payload, `error: ${error}`)
  }
}