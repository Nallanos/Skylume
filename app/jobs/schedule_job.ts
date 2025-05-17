import Account from "#models/account";
import Scheduling from "#models/scheduling";
import type AccountService from "#services/account_service";

interface ScheduleJobPayload {
    schedule_id: number;
}

const handle = async (data: ScheduleJobPayload, account_service: AccountService): Promise<void> => {
    try {
        const schedule = await Scheduling.find(data.schedule_id);

        if (!schedule) {
            throw new Error(`Schedule not found for ID: ${data.schedule_id}`);
        }

        const account = await Account.findOrFail(schedule.account_id)

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
