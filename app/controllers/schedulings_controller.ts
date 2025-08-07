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
        console.log('[DEBUG] schedulePost called')
        console.log('[DEBUG] Request body:', request.all())
        
        const user = auth.user
        if (!user) throw new Error("user is not auth")
        
        const schedules = await Scheduling.query()
            .where('userId', user.id)
            .andWhere('status', 'pending')

        console.log("Current schedule count:", schedules.length)

        if (schedules.length >= 5 && user.plan == "free") {
            user.isScheduledLimitReached = true
            await user.save()
            return response.redirect("/schedule")
        }

        const { account_handle, message, schedule_time } = request.all()
        console.log('[DEBUG] Extracted data:', { account_handle, message, schedule_time })

        // Validation
        if (!account_handle || !message || !schedule_time) {
            console.log('[DEBUG] Validation failed - missing fields')
            return response.status(400).json({ 
                message: 'Missing required fields: account_handle, message, and schedule_time are required' 
            });
        }

        const account = await Account.findBy('handle', account_handle);
        console.log('[DEBUG] Found account:', account?.handle)
        
        if (!account) {
            console.log('[DEBUG] Account not found for handle:', account_handle)
            return response.status(400).json({ message: 'Account not found' });
        }

        // Vérifier que la date n'est pas dans le passé
        const scheduleDate = new Date(schedule_time)
        console.log('[DEBUG] Schedule date:', scheduleDate, 'Current date:', new Date())
        
        if (scheduleDate <= new Date()) {
            console.log('[DEBUG] Schedule date is in the past')
            return response.status(400).json({ message: 'Schedule time must be in the future' });
        }

        try {
            const scheduling = await Scheduling.create({ 
                account_id: account.id, 
                message, 
                scheduleTime: schedule_time, 
                userId: account.userId,
                status: 'pending'
            });

            console.log('[DEBUG] Created scheduling:', scheduling.id)
            await this.scheduling_manager.createOneJob(scheduling)
            
            console.log(`[INFO] Created schedule ${scheduling.id} for ${account.handle}`)
            return response.redirect("/schedule");
        } catch (error) {
            console.error('[ERROR] Failed to create schedule:', error)
            return response.status(500).json({ message: 'Failed to create schedule' });
        }
    }

    public async editPost({ request, response }: HttpContext) {
        const { id, account_id, message, schedule_time } = request.all()
        const scheduling = await Scheduling.findOrFail(id);

        scheduling.account_id = account_id;
        scheduling.message = message;
        scheduling.scheduleTime = schedule_time;
        await scheduling.save();

        // Utiliser la méthode updateJob qui gère correctement la suppression et la création
        await this.scheduling_manager.updateJob(scheduling)

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