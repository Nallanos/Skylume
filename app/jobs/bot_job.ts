import Account from '#models/account';
import Listener from '#models/listener';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';
import type { NotificationData } from '../bluesky/types.js';

interface BotJobPayload {
  account_id: string;
}

const handle = async (data: BotJobPayload): Promise<void> => {
  try {

    const accountWithMethod = await Account.find(data.account_id);
    if (!accountWithMethod) {
      throw new Error(`Account not found for ID: ${data.account_id}`);
    }

    console.log(`\n[INFO] Processing account: ID=${accountWithMethod.id}, handle=${accountWithMethod.handle}`);

    let user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
    if (!user_service) {
      await users_bot_service_manager.initAllUsersBotService();
      user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
      if (!user_service) {
        throw new Error(`User service not found for userId: ${accountWithMethod.userId}`);
      }
    }

    await user_service.initializeMapHandler();

    const listeners = await Listener.findManyBy('account_id', accountWithMethod.id);
    await user_service.createOrResumeSession(accountWithMethod);

    const notificationData: NotificationData[] | undefined = await user_service.fetchAccountNotifications(accountWithMethod);
    if (!notificationData) {
      console.log(`\n[INFO] No notifications found for account: ${accountWithMethod.handle}`);
      return;
    }
    console.log(`\n[INFO] Notifications of the account: ${notificationData.length}`);
    console.log(`\n[INFO] Seen Notification for account: ${accountWithMethod.handle}`);

    accountWithMethod.seenNotificationAt = new Date().toISOString();
    await accountWithMethod.save();

    console.log(`\n[INFO] Starting listeners for account: ${accountWithMethod.handle}`);
    await user_service.startAllListeners(notificationData, listeners);

  } catch (err) {
    console.error("[ERROR] Error in BotJob:", err);
  }
}

export default handle;
