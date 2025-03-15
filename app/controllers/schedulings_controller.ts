import Scheduling from "#models/scheduling";
import { HttpContext } from "@adonisjs/core/http";
import Account from "#models/account";
import scheduling_manager from "../bluesky/scheduling_manager.js";
export default class SchedulingsController {
    public async schedulePost({ request, response }: HttpContext) {
        const { account_handle, message, schedule_time } = request.all()

        const account = await Account.findBy('handle', account_handle);

        if (!account) {
            return response.status(400).json({ message: 'Account not found' });
        }

        const scheduling = await Scheduling.create({ account_id: account.id, message, scheduleTime: schedule_time, userId: account.userId });

        await scheduling_manager.createOneJob(scheduling)

        response.redirect("/schedule");
    }

    public async getAllPosts({ response, request }: HttpContext) {
        const user_id = request.input('user_id');

        const schedulings = await Scheduling.query().select('*').where('user_id', user_id)

        return response.json(schedulings);
    }

    public async editPost({ request, response }: HttpContext) {
        const { id, account_id, message, schedule_time } = request.all()
        const scheduling = await Scheduling.findOrFail(id);

        scheduling.account_id = account_id;
        scheduling.message = message;
        scheduling.scheduleTime = schedule_time;
        await scheduling.save();

        scheduling_manager.removeJob(scheduling.jobId)
        scheduling_manager.createOneJob(scheduling)

        return response.redirect().back();
    }

    public async deletePost({ request, response }: HttpContext) {
        const { schedule_id } = request.all()

        const scheduling = await Scheduling.findOrFail(schedule_id);

        await scheduling_manager.removeJob(scheduling.jobId);

        await scheduling.delete();

        return response.redirect().back();
    }
}