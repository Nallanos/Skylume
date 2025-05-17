import Scheduling from "#models/scheduling";
import { HttpContext } from "@adonisjs/core/http";
import { SchedulingQueueManager } from "../bluesky/scheduling_manager.js";
import Account from "#models/account";
import { inject } from "@adonisjs/core";


@inject()
export default class SchedulingsController {
    constructor(
        protected scheduling_manager: SchedulingQueueManager) {

    }

    public async schedulePost({ request, response, auth }: HttpContext) {
        const user = auth.user
        if (!user) throw new Error("user is not auth")
        const schedules = await Scheduling.query()
            .where('userId', user.id)
            .andWhere('status', 'pending')

        console.warn("length", schedules.length)

        if (schedules.length >= 5 && user.plan == "free") {
            user.isScheduledLimitReached = true
            await user.save()
            return response.redirect("/schedule")
        }

        const { account_handle, message, schedule_time } = request.all()

        const account = await Account.findBy('handle', account_handle);

        if (!account) {
            return response.status(400).json({ message: 'Account not found' });
        }

        const scheduling = await Scheduling.create({ account_id: account.id, message, scheduleTime: schedule_time, userId: account.userId });

        await this.scheduling_manager.createOneJob(scheduling)

        return response.redirect("/schedule");
    }

    public async editPost({ request, response }: HttpContext) {
        const { id, account_id, message, schedule_time } = request.all()
        const scheduling = await Scheduling.findOrFail(id);

        scheduling.account_id = account_id;
        scheduling.message = message;
        scheduling.scheduleTime = schedule_time;
        await scheduling.save();

        this.scheduling_manager.removeJob(scheduling.jobId)
        this.scheduling_manager.createOneJob(scheduling)

        return response.redirect().back();
    }

    public async deletePost({ request, response, auth }: HttpContext) {
        const { schedule_id } = request.all()
        const scheduling = await Scheduling.findOrFail(schedule_id);

        await this.scheduling_manager.removeJob(scheduling.jobId);

        await scheduling.delete();

        const user = auth.user
        if (!user) throw new Error("User is not auth")

        const schedules = await Scheduling.query()
            .where('userId', user.id)
            .andWhere('status', 'pending')

        if (schedules.length < 5) {
            user.isScheduledLimitReached = false
            await user.save()
        }

        return response.redirect().back();
    }
}