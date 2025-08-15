import Scheduling from "#models/scheduling";
import { HttpContext } from "@adonisjs/core/http";
import { SchedulingQueueManager } from "../services/scheduling_manager.js";
import Account from "#models/account";
import { inject } from "@adonisjs/core";


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
        const scheduleDate = new Date(schedule_time)
        if (scheduleDate <= new Date()) {
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
            const successful = scheduleResults.filter(result => result.success)
            const failed = scheduleResults.filter(result => !result.success)

            // Messages de feedback
            if (successful.length > 0) {
                const platforms = successful.map(r => r.platform).join(', ')
                session.flash('success', `Successfully scheduled ${successful.length} post(s) on: ${platforms}`)
            }
            
            if (failed.length > 0) {
                const errors = failed.map(r => r.error).join('; ')
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
            scheduling.accountId = account.id
            scheduling.accountHandle = account.handle
            scheduling.platform = platform
            scheduling.message = message
            scheduling.scheduleTime = new Date(schedule_time)
            scheduling.status = 'pending'

            // Ajouter les médias si présents
            if (imageUrls.length > 0) {
                scheduling.imageUrls = JSON.stringify(imageUrls)
            }
            if (videoUrls.length > 0) {
                scheduling.videoUrls = JSON.stringify(videoUrls)
            }
            if (altTexts.length > 0) {
                scheduling.altTexts = JSON.stringify(altTexts)
            }
            if (contentWarnings.length > 0) {
                scheduling.contentWarnings = JSON.stringify(contentWarnings)
            }

            await scheduling.save()

            // Ajouter à la queue
            await this.scheduling_manager.addToQueue(scheduling, new Date(schedule_time), user)

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
            scheduling.schedule_time = new Date(schedule_time)
            await scheduling.save()

            session.flash('success', 'Post updated successfully')
        } catch (error) {
            console.error('[ERROR] Failed to update post:', error)
            session.flash('error', 'Failed to update post')
        }

        return response.redirect('/schedule')
    }

        // Handle file uploads (images)
        const images = request.files('images', {
            size: '10mb',
            extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        })
        console.log('[DEBUG] Uploaded images:', images?.length || 0)

        // Handle file uploads (videos)
        const videos = request.files('videos', {
            size: '50mb',
            extnames: ['mp4', 'mov', 'webm']
        })
        console.log('[DEBUG] Uploaded videos:', videos?.length || 0)

                // Extract video alt texts if present
        let videoAltTexts: string[] = []
        try {
            const formData = request.all()
            if (formData.video_alt_texts) {
                if (typeof formData.video_alt_texts === 'string') {
                    videoAltTexts = JSON.parse(formData.video_alt_texts)
                } else {
                    videoAltTexts = formData.video_alt_texts
                }
            }
        } catch (parseError) {
            console.error('[DEBUG] Error parsing video alt texts:', parseError)
        }

        // Extract crossposting data
        let enableCrosspost = false
        let crosspostPlatforms: string[] = ['bluesky']
        try {
            const formData = request.all()
            
            if (formData.enable_crosspost) {
                enableCrosspost = formData.enable_crosspost === 'true' || formData.enable_crosspost === true
            }
            
            if (formData.crosspost_platforms) {
                if (typeof formData.crosspost_platforms === 'string') {
                    crosspostPlatforms = JSON.parse(formData.crosspost_platforms)
                } else {
                    crosspostPlatforms = formData.crosspost_platforms
                }
            }
            
            console.log('[DEBUG] Crossposting settings:', { enableCrosspost, crosspostPlatforms })
        } catch (parseError) {
            console.error('[DEBUG] Error parsing crossposting data:', parseError)
        }

        // Validation
        if (!account_handle || !message || !schedule_time || !platform) {
            console.log('[DEBUG] Validation failed - missing fields')
            session.flash('error', 'Missing required fields: account_handle, message, schedule_time, and platform are required')
            return response.redirect('/schedule')
        }

        // Validation: Ne pas permettre images ET vidéos en même temps
        if (images && images.length > 0 && videos && videos.length > 0) {
            console.log('[DEBUG] Validation failed - both images and videos provided')
            session.flash('error', 'Cannot upload both images and videos in the same post. Please choose either images OR videos.')
            return response.redirect('/schedule')
        }

        // Validation: Limite de vidéos (1 seule vidéo par post)
        if (videos && videos.length > 1) {
            console.log('[DEBUG] Validation failed - too many videos')
            session.flash('error', 'Only one video per post is allowed')
            return response.redirect('/schedule')
        }

        // Find the account based on platform
        let account: any; // Use any for now to handle different account types
        let accountHandle: string;
        
        console.log('[DEBUG] Looking for account - platform:', platform, 'handle:', account_handle)
        
        if (platform === 'bluesky') {
            account = await Account.query()
                .where('handle', account_handle)
                .andWhere('user_id', user.id)
                .first();
            accountHandle = account?.handle || '';
            console.log('[DEBUG] Bluesky account search result:', account ? 'found' : 'not found', 'for handle:', account_handle)
        } else if (platform === 'twitter') {
            const TwitterAccount = (await import('#models/twitter_account')).default
            account = await TwitterAccount.query()
                .where('username', account_handle)
                .andWhere('user_id', user.id)
                .first();
            accountHandle = account?.username || '';
            console.log('[DEBUG] Twitter account search result:', account ? 'found' : 'not found', 'for username:', account_handle)
        } else if (platform === 'threads') {
            // TODO: Implement Threads account lookup when Threads model is ready
            console.log('[DEBUG] Threads platform not yet implemented')
            session.flash('error', 'Threads platform is not yet implemented')
            return response.redirect('/schedule')
        } else {
            console.log('[DEBUG] Invalid platform:', platform)
            session.flash('error', 'Invalid platform specified. Only Bluesky and Twitter are supported.')
            return response.redirect('/schedule')
        }
        
        console.log('[DEBUG] Found account for platform', platform, ':', accountHandle)
        
        if (!account) {
            console.log('[DEBUG] Account not found for handle:', account_handle, 'platform:', platform)
            session.flash('error', `Account not found for ${platform}`)
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

            // Handle video uploads with processing
            let videoPaths: string[] = []
            let videoThumbnails: string[] = []
            let videoDurations: number[] = []
            let videoSizes: number[] = []
            let videoMetadata: any[] = []
            
            if (videos && Array.isArray(videos)) {
                console.log('[DEBUG] Processing', videos.length, 'videos')

                // Créer les répertoires uploads s'ils n'existent pas
                const uploadsDir = 'public/uploads/schedules'
                const thumbnailsDir = 'public/uploads/schedules/thumbnails'
                const fs = await import('fs')
                
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true })
                }
                if (!fs.existsSync(thumbnailsDir)) {
                    fs.mkdirSync(thumbnailsDir, { recursive: true })
                }

                // Import du service de traitement vidéo
                const VideoProcessingService = (await import('#services/video_processing_service')).default

                // Vérifier que FFmpeg est installé
                const ffmpegAvailable = await VideoProcessingService.checkFFmpegInstallation()
                if (!ffmpegAvailable) {
                    console.error('[DEBUG] FFmpeg not available, video processing disabled')
                    session.flash('error', 'Video processing is not available on this server')
                    return response.redirect('/schedule')
                }

                for (const video of videos) {
                    if (video.isValid) {
                        try {
                            const fileName = `${user.id}_${Date.now()}_${video.clientName}`
                            const tempPath = `${uploadsDir}/${fileName}`
                            
                            // Sauvegarder le fichier temporairement
                            await video.move(uploadsDir, { name: fileName })
                            console.log('[DEBUG] Video saved temporarily:', fileName)

                            // Traiter la vidéo (validation + thumbnail + métadonnées)
                            const processedVideo = await VideoProcessingService.processVideo(tempPath, user.id)
                            
                            videoPaths.push(processedVideo.path)
                            videoThumbnails.push(processedVideo.thumbnailPath)
                            videoDurations.push(processedVideo.metadata.duration)
                            videoSizes.push(processedVideo.metadata.size)
                            videoMetadata.push({
                                width: processedVideo.metadata.width,
                                height: processedVideo.metadata.height,
                                format: processedVideo.metadata.format,
                                codec: processedVideo.metadata.codec,
                                bitrate: processedVideo.metadata.bitrate
                            })
                            
                            console.log('[DEBUG] Video processed successfully:', fileName)
                        } catch (videoError) {
                            console.error('[DEBUG] Error processing video:', videoError)
                            session.flash('error', `Error processing video: ${videoError.message}`)
                            return response.redirect('/schedule')
                        }
                    }
                }
            }

            console.log('[DEBUG] Creating schedule entry...')
            console.log('[DEBUG] About to save data:')
            console.log('  - images:', JSON.stringify(imagePaths))
            console.log('  - altTexts:', JSON.stringify(altTexts))
            console.log('  - contentWarnings:', JSON.stringify(contentWarnings))
            console.log('  - videos:', JSON.stringify(videoPaths))
            console.log('  - videoAltTexts:', JSON.stringify(videoAltTexts))
            console.log('  - videoThumbnails:', JSON.stringify(videoThumbnails))
            
            // Create scheduling entry with platform-specific account references
            const schedulingData: any = {
                userId: user.id,
                message: message,
                scheduleTime: schedule_time,
                status: 'pending',
                images: imagePaths,
                altTexts: altTexts,
                contentWarnings: contentWarnings,
                videos: videoPaths,
                videoAltTexts: videoAltTexts,
                videoThumbnails: videoThumbnails,
                videoDurations: videoDurations,
                videoSizes: videoSizes,
                videoMetadata: videoMetadata,
                enableCrosspost: true,
                crosspostPlatforms: [platform],
                twitterSettings: {},
                threadsSettings: {},
                platformStatuses: {},
                platformPostIds: {},
                platformErrors: {},
            }

            // Set the appropriate account reference based on platform
            if (platform === 'bluesky') {
                schedulingData.account_id = account.id.toString()
            } else if (platform === 'twitter') {
                schedulingData.twitterAccountId = account.id
            }

            const scheduling = await Scheduling.create(schedulingData)

            console.log('[DEBUG] Schedule created with ID:', scheduling.id)
            console.log('[DEBUG] Saved schedule data:')
            console.log('  - images:', scheduling.images)
            console.log('  - altTexts:', scheduling.altTexts)
            console.log('  - contentWarnings:', scheduling.contentWarnings)
            console.log('  - videos:', scheduling.videos)
            console.log('  - videoAltTexts:', scheduling.videoAltTexts)
            console.log('[DEBUG] Images saved:', imagePaths.length, 'files')
            console.log('[DEBUG] Videos saved:', videoPaths.length, 'files')
            console.log('[DEBUG] Alt texts:', altTexts.length, 'entries')
            console.log('[DEBUG] Video alt texts:', videoAltTexts.length, 'entries')
            console.log('[DEBUG] Content warnings:', contentWarnings.length, 'entries')

            await this.scheduling_manager.createOneJob(scheduling)
            
            console.log(`[INFO] Created schedule ${scheduling.id} for ${accountHandle} on ${platform}`)
            
            // Message de succès incluant les médias
            let successMessage = 'Post scheduled successfully'
            if (videoPaths.length > 0) {
                successMessage += ` with ${videoPaths.length} video(s)`
            } else if (imagePaths.length > 0) {
                successMessage += ` with ${imagePaths.length} image(s)`
            }
            successMessage += '!'
            
            session.flash('success', successMessage)
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