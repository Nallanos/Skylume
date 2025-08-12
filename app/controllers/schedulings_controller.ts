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

    public async schedulePost({ request, response, auth, session }: HttpContext) {
        console.log('[DEBUG] schedulePost called')
        console.log('[CONTROLLER DEBUG] THIS IS THE REAL CONTROLLER FILE!')
        console.log('[DEBUG] Request body keys:', Object.keys(request.all()))
        
        const user = auth.user
        if (!user) {
            console.log('[DEBUG] User not authenticated')
            return response.redirect('/dashboard')
        }
        
        const schedules = await Scheduling.query()
            .where('userId', user.id)
            .andWhere('status', 'pending')

        console.log("Current schedule count:", schedules.length)

        if (schedules.length >= 5 && user.plan == "free") {
            user.isScheduledLimitReached = true
            await user.save()
            session.flash('error', 'You have reached the free plan limit (5/5 posts)')
            return response.redirect('/schedule')
        }

        const { account_handle, message, schedule_time } = request.all()
        
        // Extract alt texts and content warnings from FormData
        let altTexts: string[] = []
        let contentWarnings: string[] = []
        
        try {
            const formData = request.all()
            console.log('[DEBUG] FormData contents:')
            for (const [key, value] of Object.entries(formData)) {
                console.log(`  ${key}:`, value)
            }
            
            // Parse alt texts if present
            if (formData.alt_texts) {
                if (typeof formData.alt_texts === 'string') {
                    altTexts = JSON.parse(formData.alt_texts)
                } else {
                    altTexts = formData.alt_texts
                }
            }
            
            // Parse content warnings if present
            if (formData.content_warnings) {
                if (typeof formData.content_warnings === 'string') {
                    contentWarnings = JSON.parse(formData.content_warnings)
                } else {
                    contentWarnings = formData.content_warnings
                }
            }
            
            console.log('[DEBUG] Parsed alt texts:', altTexts)
            console.log('[DEBUG] Parsed content warnings:', contentWarnings)
        } catch (parseError) {
            console.error('[DEBUG] Error parsing alt texts or content warnings:', parseError)
        }
        
        console.log('[DEBUG] Extracted data:', { account_handle, message, schedule_time, altTexts, contentWarnings })

        // Handle file uploads (images)
        const images = request.files('images', {
            size: '10mb',
            extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        })
        console.log('[DEBUG] Uploaded images:', images?.length || 0)

        // Validation
        if (!account_handle || !message || !schedule_time) {
            console.log('[DEBUG] Validation failed - missing fields')
            session.flash('error', 'Missing required fields: account_handle, message, and schedule_time are required')
            return response.redirect('/schedule')
        }

        const account = await Account.findBy('handle', account_handle);
        console.log('[DEBUG] Found account:', account?.handle)
        
        if (!account) {
            console.log('[DEBUG] Account not found for handle:', account_handle)
            session.flash('error', 'Account not found')
            return response.redirect('/schedule')
        }

        // Vérifier que la date n'est pas dans le passé
        const scheduleDate = new Date(schedule_time)
        console.log('[DEBUG] Schedule date:', scheduleDate, 'Current date:', new Date())
        
        if (scheduleDate <= new Date()) {
            console.log('[DEBUG] Schedule date is in the past')
            session.flash('error', 'Schedule time must be in the future')
            return response.redirect('/schedule')
        }

        try {
            // Handle image uploads
            let imagePaths: string[] = []
            if (images && Array.isArray(images)) {
                console.log('[DEBUG] Processing', images.length, 'images')

                // Créer le répertoire uploads s'il n'existe pas
                const uploadsDir = 'public/uploads/schedules'
                const fs = await import('fs')
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true })
                }

                for (const image of images) {
                    if (image.isValid) {
                        const fileName = `${user.id}_${Date.now()}_${image.clientName}`
                        await image.move(uploadsDir, { name: fileName })
                        imagePaths.push(`/uploads/schedules/${fileName}`)
                        console.log('[DEBUG] Image saved:', fileName)
                    }
                }
            }

            console.log('[DEBUG] Creating schedule entry...')
            console.log('[DEBUG] About to save data:')
            console.log('  - images:', JSON.stringify(imagePaths))
            console.log('  - altTexts:', JSON.stringify(altTexts))
            console.log('  - contentWarnings:', JSON.stringify(contentWarnings))
            
            const scheduling = await Scheduling.create({
                userId: user.id,
                account_id: account.id,
                message: message,
                scheduleTime: schedule_time,
                status: 'pending',
                images: JSON.stringify(imagePaths),
                altTexts: JSON.stringify(altTexts),
                contentWarnings: JSON.stringify(contentWarnings),
            })

            console.log('[DEBUG] Schedule created with ID:', scheduling.id)
            console.log('[DEBUG] Saved schedule data:')
            console.log('  - images:', scheduling.images)
            console.log('  - altTexts:', scheduling.altTexts)
            console.log('  - contentWarnings:', scheduling.contentWarnings)
            console.log('[DEBUG] Images saved:', imagePaths.length, 'files')
            console.log('[DEBUG] Alt texts:', altTexts.length, 'entries')
            console.log('[DEBUG] Content warnings:', contentWarnings.length, 'entries')

            await this.scheduling_manager.createOneJob(scheduling)
            
            console.log(`[INFO] Created schedule ${scheduling.id} for ${account.handle}`)
            session.flash('success', `Post scheduled successfully${imagePaths.length > 0 ? ` with ${imagePaths.length} image(s)` : ''}!`)
            return response.redirect("/schedule");
        } catch (error) {
            console.error('[ERROR] Failed to create schedule:', error)
            session.flash('error', 'An error occurred while scheduling the post. Please try again.')
            return response.redirect('/schedule')
        }
    }

    public async editPost({ request, response, session }: HttpContext) {
        console.log('[DEBUG] editPost called')
        console.log('[DEBUG] Request body:', request.all())

        const { scheduleId, message, schedule_time } = request.all()

        if (!scheduleId || !message || !schedule_time) {
            console.log('[DEBUG] Missing required fields for edit')
            session.flash('error', 'Schedule ID, message, and schedule_time are required')
            return response.redirect('/schedule')
        }

        try {
            const scheduling = await Scheduling.findOrFail(scheduleId);

            scheduling.message = message;
            scheduling.scheduleTime = schedule_time;
            await scheduling.save();

            // Utiliser la méthode updateJob qui gère correctement la suppression et la création
            await this.scheduling_manager.updateJob(scheduling)

            console.log('[DEBUG] Schedule updated successfully:', scheduleId)
            session.flash('success', 'Schedule updated successfully!')
            return response.redirect('/schedule')
        } catch (error) {
            console.error('[DEBUG] Error updating schedule:', error)
            session.flash('error', 'An error occurred while updating the schedule')
            return response.redirect('/schedule')
        }
    }

    public async deletePost({ request, response, auth, session }: HttpContext) {
        console.log('[DEBUG] deletePost called')
        console.log('[DEBUG] Request body:', request.all())

        const user = auth.user
        if (!user) {
            console.log('[DEBUG] User not authenticated')
            return response.redirect('/dashboard')
        }

        const { scheduleId } = request.all()

        if (!scheduleId) {
            console.log('[DEBUG] Missing scheduleId')
            session.flash('error', 'Schedule ID is required')
            return response.redirect('/schedule')
        }

        try {
            const scheduling = await Scheduling.query()
                .where('id', scheduleId)
                .where('userId', user.id)
                .first()

            if (!scheduling) {
                console.log('[DEBUG] Schedule not found or unauthorized')
                session.flash('error', 'Schedule not found')
                return response.redirect('/schedule')
            }

            if (scheduling.jobId) {
                await this.scheduling_manager.removeJob(scheduling.jobId);
            }

            await scheduling.delete();

            // Update user limit flag if needed
            const schedules = await Scheduling.query()
                .where('userId', user.id)
                .andWhere('status', 'pending')

            if (schedules.length < 5) {
                user.isScheduledLimitReached = false
                await user.save()
            }

            console.log('[DEBUG] Schedule deleted successfully:', scheduleId)
            session.flash('success', 'Schedule deleted successfully!')
            return response.redirect('/schedule')
        } catch (error) {
            console.error('[DEBUG] Error deleting schedule:', error)
            session.flash('error', 'An error occurred while deleting the schedule')
            return response.redirect('/schedule')
        }
    }
}