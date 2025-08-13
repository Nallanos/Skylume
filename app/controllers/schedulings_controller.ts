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
            console.log('[DEBUG] Parsed video alt texts:', videoAltTexts)
        } catch (parseError) {
            console.error('[DEBUG] Error parsing video alt texts:', parseError)
        }

        // Validation
        if (!account_handle || !message || !schedule_time) {
            console.log('[DEBUG] Validation failed - missing fields')
            session.flash('error', 'Missing required fields: account_handle, message, and schedule_time are required')
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
            
            const scheduling = await Scheduling.create({
                userId: user.id,
                account_id: account.id,
                message: message,
                scheduleTime: schedule_time,
                status: 'pending',
                images: JSON.stringify(imagePaths),
                altTexts: JSON.stringify(altTexts),
                contentWarnings: JSON.stringify(contentWarnings),
                videos: JSON.stringify(videoPaths),
                videoAltTexts: JSON.stringify(videoAltTexts),
                videoThumbnails: JSON.stringify(videoThumbnails),
                videoDurations: JSON.stringify(videoDurations),
                videoSizes: JSON.stringify(videoSizes),
                videoMetadata: JSON.stringify(videoMetadata),
            })

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
            
            console.log(`[INFO] Created schedule ${scheduling.id} for ${account.handle}`)
            
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