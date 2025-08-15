import Scheduling from "#models/scheduling";
import { HttpContext } from "@adonisjs/core/http";
import { SchedulingQueueManager } from "../services/scheduling_manager.js";
import Account from "#models/account";
import { inject } from "@adonisjs/core";
import { DateTime } from 'luxon'


@inject()
export default class SchedulingsController {
    constructor(
        protected scheduling_manager: SchedulingQueueManager) {
    }

    public async schedulePost({ request, response, auth, session }: HttpContext) {
        console.log('[DEBUG] schedulePost called - REFACTORED VERSION')
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

        const { message, schedule_time, selected_accounts } = request.all()
        console.log('[DEBUG] Received crosspost request:', { message: message?.slice(0, 50) + '...', schedule_time, selected_accounts })

        // ✅ NOUVEAU: Parser les comptes sélectionnés depuis JSON
        let accountIds: string[] = []
        try {
            if (typeof selected_accounts === 'string') {
                accountIds = JSON.parse(selected_accounts)
            } else if (Array.isArray(selected_accounts)) {
                accountIds = selected_accounts
            }
        } catch (error) {
            console.error('[DEBUG] Failed to parse selected_accounts:', error)
            session.flash('error', 'Invalid account selection format')
            return response.redirect('/schedule')
        }

        if (!accountIds || accountIds.length === 0) {
            console.log('[DEBUG] No accounts selected')
            session.flash('error', 'At least one account must be selected')
            return response.redirect('/schedule')
        }

        // Validation des champs requis
        if (!message || !schedule_time) {
            console.log('[DEBUG] Missing required fields')
            session.flash('error', 'Message and schedule time are required')
            return response.redirect('/schedule')
        }

        // Vérifier la limite pour les comptes gratuits
        if (schedules.length + accountIds.length > 5 && user.plan == "free") {
            user.isScheduledLimitReached = true
            await user.save()
            session.flash('error', `You have reached the free plan limit. Cannot schedule ${accountIds.length} more posts.`)
            return response.redirect('/schedule')
        }

        // Vérifier que la date n'est pas dans le passé
        const scheduleDate = DateTime.fromISO(schedule_time)
        if (scheduleDate <= DateTime.now()) {
            console.log('[DEBUG] Schedule date is in the past')
            session.flash('error', 'Schedule time must be in the future')
            return response.redirect('/schedule')
        }

        try {
            // ✅ NOUVEAU: Traiter chaque compte sélectionné
            const schedulePromises = accountIds.map(accountId => 
                this.createScheduleForAccount(accountId, message, schedule_time, request, user)
            )

            const scheduleResults = await Promise.all(schedulePromises)
            const successful = scheduleResults.filter((result: any) => result.success)
            const failed = scheduleResults.filter((result: any) => !result.success)

            // Messages de feedback
            if (successful.length > 0) {
                const platforms = successful.map((r: any) => r.platform).join(', ')
                session.flash('success', `Successfully scheduled ${successful.length} post(s) on: ${platforms}`)
            }
            
            if (failed.length > 0) {
                const errors = failed.map((r: any) => r.error).join('; ')
                session.flash('error', `Failed to schedule ${failed.length} post(s): ${errors}`)
            }

            return response.redirect("/schedule")
        } catch (error) {
            console.error('[ERROR] Failed to process crosspost scheduling:', error)
            session.flash('error', 'An error occurred while scheduling posts. Please try again.')
            return response.redirect('/schedule')
        }
    }

    // ✅ NOUVEAU: Méthode helper pour créer un schedule pour un compte spécifique
    private async createScheduleForAccount(
        accountId: string, 
        message: string, 
        schedule_time: string, 
        request: any, 
        user: any
    ): Promise<{ success: boolean; platform?: string; error?: string }> {
        try {
            console.log('[DEBUG] Processing account:', accountId)
            
            // Parser le format "platform:id"
            const [platform, id] = accountId.split(':')
            if (!platform || !id) {
                console.error('[DEBUG] Invalid account format:', accountId)
                return { success: false, error: `Invalid account format: ${accountId}` }
            }

            // Chercher le compte selon la plateforme
            let account
            if (platform === 'bluesky') {
                account = await Account.findBy('id', parseInt(id))
            } else if (platform === 'twitter') {
                // TODO: Implémenter la recherche Twitter Account quand le modèle sera créé
                console.log('[DEBUG] Twitter platform not yet implemented')
                return { success: false, error: 'Twitter platform not yet implemented' }
            } else {
                console.error('[DEBUG] Unknown platform:', platform)
                return { success: false, error: `Unknown platform: ${platform}` }
            }

            if (!account || account.userId !== user.id) {
                console.error('[DEBUG] Account not found or unauthorized:', { platform, id, userId: user.id })
                return { success: false, error: `Account not found or unauthorized: ${platform}:${id}` }
            }

            // Extraire les médias et métadonnées depuis FormData
            const { imageUrls, videoUrls, altTexts, contentWarnings } = await this.extractMediaFromRequest(request)

            // Créer le scheduling
            const scheduling = new Scheduling()
            scheduling.userId = user.id
            scheduling.account_id = account.id
            scheduling.message = message
            scheduling.scheduleTime = DateTime.fromISO(schedule_time)
            scheduling.status = 'pending'

            // Ajouter les médias si présents
            if (imageUrls.length > 0) {
                scheduling.images = JSON.stringify(imageUrls)
            }
            if (videoUrls.length > 0) {
                scheduling.videos = JSON.stringify(videoUrls)
            }
            if (altTexts.length > 0) {
                scheduling.altTexts = JSON.stringify(altTexts)
            }
            if (contentWarnings.length > 0) {
                scheduling.contentWarnings = JSON.stringify(contentWarnings)
            }

            await scheduling.save()

            // Ajouter à la queue
            await this.scheduling_manager.createOneJob(scheduling)

            console.log('[DEBUG] Successfully created schedule for:', { platform, handle: account.handle })
            return { success: true, platform: platform }

        } catch (error) {
            console.error('[ERROR] Failed to create schedule for account:', accountId, error)
            return { success: false, error: `Failed to create schedule: ${error.message}` }
        }
    }

    // ✅ NOUVEAU: Méthode helper pour extraire les médias depuis la requête
    private async extractMediaFromRequest(request: any): Promise<{
        imageUrls: string[];
        videoUrls: string[];
        altTexts: string[];
        contentWarnings: string[];
    }> {
        let imageUrls: string[] = []
        let videoUrls: string[] = []
        let altTexts: string[] = []
        let contentWarnings: string[] = []

        try {
            const formData = request.all()
            console.log('[DEBUG] Extracting media from FormData')

            // Parse alt texts si présent
            if (formData.alt_texts) {
                if (typeof formData.alt_texts === 'string') {
                    altTexts = JSON.parse(formData.alt_texts)
                } else if (Array.isArray(formData.alt_texts)) {
                    altTexts = formData.alt_texts
                }
            }

            // Parse content warnings si présent
            if (formData.content_warnings) {
                if (typeof formData.content_warnings === 'string') {
                    contentWarnings = JSON.parse(formData.content_warnings)
                } else if (Array.isArray(formData.content_warnings)) {
                    contentWarnings = formData.content_warnings
                }
            }

            // Parse image URLs si présent
            if (formData.image_urls) {
                if (typeof formData.image_urls === 'string') {
                    imageUrls = JSON.parse(formData.image_urls)
                } else if (Array.isArray(formData.image_urls)) {
                    imageUrls = formData.image_urls
                }
            }

            // Parse video URLs si présent
            if (formData.video_urls) {
                if (typeof formData.video_urls === 'string') {
                    videoUrls = JSON.parse(formData.video_urls)
                } else if (Array.isArray(formData.video_urls)) {
                    videoUrls = formData.video_urls
                }
            }

            // Gérer les fichiers uploadés directement
            const uploadedImages = request.files('images')
            if (uploadedImages && uploadedImages.length > 0) {
                for (let i = 0; i < uploadedImages.length; i++) {
                    const image = uploadedImages[i]
                    const imageName = `${Date.now()}_${i}_${image.clientName}`
                    await image.move('public/uploads', { name: imageName })
                    imageUrls.push(`/uploads/${imageName}`)
                }
            }

            const uploadedVideos = request.files('videos')
            if (uploadedVideos && uploadedVideos.length > 0) {
                for (let i = 0; i < uploadedVideos.length; i++) {
                    const video = uploadedVideos[i]
                    const videoName = `${Date.now()}_${i}_${video.clientName}`
                    await video.move('public/videos', { name: videoName })
                    videoUrls.push(`/videos/${videoName}`)
                }
            }

            console.log('[DEBUG] Extracted media:', { 
                imageCount: imageUrls.length, 
                videoCount: videoUrls.length, 
                altTextCount: altTexts.length,
                contentWarningCount: contentWarnings.length 
            })

        } catch (error) {
            console.error('[ERROR] Failed to extract media from request:', error)
        }

        return { imageUrls, videoUrls, altTexts, contentWarnings }
    }

    public async editPost({ request, response, session }: HttpContext) {
        const { id, message, schedule_time } = request.all()

        try {
            const scheduling = await Scheduling.findOrFail(id)
            scheduling.message = message
            scheduling.scheduleTime = DateTime.fromISO(schedule_time)
            await scheduling.save()

            session.flash('success', 'Post updated successfully')
        } catch (error) {
            console.error('[ERROR] Failed to update post:', error)
            session.flash('error', 'Failed to update post')
        }

        return response.redirect('/schedule')
    }

    public async deletePost({ request, response, auth, session }: HttpContext) {
        const user = auth.user
        if (!user) {
            return response.redirect('/dashboard')
        }

        const { id: scheduleId } = request.params()
        console.log('[DEBUG] deletePost called with ID:', scheduleId)

        try {
            const scheduling = await Scheduling.query()
                .where('id', scheduleId)
                .andWhere('userId', user.id)
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
