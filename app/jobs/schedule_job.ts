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
        
        // Parse images and alt texts from the schedule
        const images = schedule.images ? (Array.isArray(schedule.images) ? schedule.images : JSON.parse(schedule.images || '[]')) : []
        const altTexts = schedule.altTexts ? (Array.isArray(schedule.altTexts) ? schedule.altTexts : JSON.parse(schedule.altTexts || '[]')) : []
        const contentWarnings = schedule.contentWarnings ? (Array.isArray(schedule.contentWarnings) ? schedule.contentWarnings : JSON.parse(schedule.contentWarnings || '[]')) : []
        
        console.log(`[DEBUG] Schedule ${schedule.id} raw data:`)
        console.log(`  - images field:`, schedule.images)
        console.log(`  - altTexts field:`, schedule.altTexts)
        console.log(`  - contentWarnings field:`, schedule.contentWarnings)
        console.log(`[DEBUG] Schedule ${schedule.id} parsed data:`)
        console.log(`  - images:`, images)
        console.log(`  - altTexts:`, altTexts)
        console.log(`  - contentWarnings:`, contentWarnings)
        
        console.log(`[INFO] Schedule ${schedule.id} has ${images.length} images with alt texts and ${contentWarnings.length} content warnings`)
        
        // Use the new posting methods for better functionality
        if (contentWarnings.length > 0 && images.length > 0) {
            console.log(`[INFO] Using postWithImagePaths for schedule ${schedule.id} with content warnings`)
            // Map legacy content warnings to new format
            const mappedWarnings = contentWarnings.map((warning: string) => {
                const warningMap: { [key: string]: string } = {
                    'adult': 'porn',
                    'suggestive': 'sexual',
                    'nudity': 'nudity',
                    'graphic-media': 'graphic-media',
                    'graphic_media': 'graphic-media',
                    'sexual': 'sexual',
                    'gore': 'gore'
                };
                return warningMap[warning] || warning;
            });
            
            await account_service.postWithImagePaths(
                account, 
                schedule.message, 
                images, 
                altTexts, 
                mappedWarnings as any
            );
        } else {
            console.log(`[INFO] Using legacy post method for schedule ${schedule.id}`)
            await account_service.post(account, schedule.message, images, altTexts, contentWarnings);
        }
        
        schedule.status = "posted"
        await schedule.save()
        console.log(`[INFO] Successfully posted schedule ${schedule.id}`)
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
