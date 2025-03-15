import Account from "#models/account";
import Scheduling from "#models/scheduling";
import AccountService from "#services/account_service";
import users_bot_service_manager from "../bluesky/users_bot_service_manager.js";

interface ScheduleJobPayload {
    schedule_id: number;
}

const handle = async (data: ScheduleJobPayload): Promise<void> => {
    try {
        const schedule = await Scheduling.find(data.schedule_id);

        if (!schedule) {
            throw new Error(`Schedule not found for ID: ${data.schedule_id}`);
        }

        let user_service = users_bot_service_manager.userbotServiceMap.get(schedule.userId);

        if (!user_service) {
            await users_bot_service_manager.initAllUsersBotService();
            user_service = users_bot_service_manager.userbotServiceMap.get(schedule.userId);

            if (!user_service) {
                throw new Error(`User service not found for userId: ${schedule.userId}`);
            }
        }
        const account_service = new AccountService(user_service.agent);


        const account = await Account.find(schedule.account_id);

        if (!account) {
            throw new Error(`Account not found for ID: ${schedule.account.id}`);
        }

        await account_service.createOrResumeSession(account);
        await account_service.post(account, schedule.message).then(async () => {
            schedule.status = "posted"
            await schedule.save()
        })
    } catch (err) {
        console.error("[ERROR] Error in BotJob:", err);
    }
}

export default handle;
