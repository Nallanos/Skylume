import Account from '#models/account';
import Listener from '#models/listener';
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js';
import type { NotificationData } from '../bluesky/types.js';
import AccountService from '#services/account_service';
import User from '#models/user';
interface BotJobPayload {
  account_id: string;
}

const handle = async (data: BotJobPayload): Promise<void> => {
  try {
    const accountWithMethod = await Account.find(data.account_id);
    if (!accountWithMethod) {
      throw new Error(`Account not found for ID: ${data.account_id}`);
    }

    const user = await User.find(accountWithMethod.userId)
    if (!user) throw new Error("cannot find user in botjob")
    if (user.dmsSent >= 30 && user.plan == "free") user.isDmsLimitReached = true
    await user.save()

    console.log(`\n[INFO] Processing account ${accountWithMethod.handle}`);

    let user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
    if (!user_service) {
      await users_bot_service_manager.initAllUsersBotService();
      user_service = users_bot_service_manager.userbotServiceMap.get(accountWithMethod.userId);
      if (!user_service) {
        throw new Error(`User service not found for userId: ${accountWithMethod.userId}`);
      }
    }

    await user_service.initializeMapHandler();

    const accountService = new AccountService(user_service.agent)

    const listeners = await Listener.findManyBy('account_id', accountWithMethod.id);
    await accountService.createOrResumeSession(accountWithMethod);
    await accountWithMethod.refresh()
    const notificationData: NotificationData[] | undefined = await accountService.fetchAccountNotifications(accountWithMethod);
    accountWithMethod.seenNotificationAt = new Date().toISOString();
    await accountWithMethod.save();
    if (!notificationData) {
      console.log(`\n[INFO] No notifications found for account: ${accountWithMethod.handle}`);
      return;
    }
    console.log(`\n[INFO] Notifications of the account: ${notificationData.length}`);



    await user_service.startAllListeners(notificationData, listeners, accountWithMethod);

  } catch (err) {
    console.error("[ERROR] Error in BotJob:", err);
  }
}

export default handle;
