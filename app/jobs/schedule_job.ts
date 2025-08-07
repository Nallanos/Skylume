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
            throw new Error(`Account not found for ID: ${schedule.account_id}`);
        }

        console.log(`[INFO] Processing schedule ${schedule.id} for account ${account.handle}`)

        await account_service.createOrResumeSession(account);
        await account_service.post(account, schedule.message).then(async () => {
            schedule.status = "posted"
            await schedule.save()
            console.log(`[INFO] Successfully posted schedule ${schedule.id}`)
        })
    } catch (err) {
        console.error("[ERROR] Error in ScheduleJob:", err);
        // Marquer le schedule comme échoué
        try {
            const schedule = await Scheduling.find(data.schedule_id);
            if (schedule) {
                schedule.status = "failed"
                await schedule.save()
            }
        } catch (updateErr) {
            console.error("[ERROR] Failed to update schedule status:", updateErr);
        }
    }
}

export default handle;
