import Scheduling from "#models/scheduling";
import { HttpContext } from "@adonisjs/core/http";
import { SchedulingQueueManager } from "../services/scheduling_manager.js";
import Account from "#models/account";
import TwitterAccount from "#models/twitter_account";
import { inject } from "@adonisjs/core";
import { DateTime } from 'luxon'
import RichTextService from '../services/rich_text_service.js'
import type { ExplicitLink } from '../../types/rich_text.js'


@inject()
export default class SchedulingsController {
    constructor(
        protected scheduling_manager: SchedulingQueueManager,
        protected richTextService: RichTextService) {
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

        const { message, schedule_time, selected_accounts, explicit_links = '[]' } = request.all()
        console.log('[DEBUG] Received crosspost request:', { message: message?.slice(0, 50) + '...', schedule_time, selected_accounts, explicit_links })

        // ✅ NOUVEAU: Parser les comptes sélectionnés depuis JSON
        let accountIds: string[] = []
        let explicitLinks: ExplicitLink[] = []
        try {
            if (typeof selected_accounts === 'string') {
                accountIds = JSON.parse(selected_accounts)
            } else if (Array.isArray(selected_accounts)) {
                accountIds = selected_accounts
            }

            // Parser les liens explicites
            if (typeof explicit_links === 'string') {
                explicitLinks = JSON.parse(explicit_links)
            } else if (Array.isArray(explicit_links)) {
                explicitLinks = explicit_links
            }
        } catch (error) {
            console.error('[DEBUG] Failed to parse selected_accounts or explicit_links:', error)
            session.flash('error', 'Invalid account selection or links format')
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

        // Valider les liens explicites
        const linkValidation = this.richTextService.validateExplicitLinks(explicitLinks)
        if (!linkValidation.valid) {
            console.log('[DEBUG] Invalid explicit links:', linkValidation.errors)
            session.flash('error', `Invalid links: ${linkValidation.errors.join(', ')}`)
            return response.redirect('/schedule')
        }

        // Vérifier la limite pour les comptes gratuits avec PlanService
        if (user.plan === "free") {
            const currentScheduledCount = schedules.length
            const newPostsCount = accountIds.length
            const totalAfterScheduling = currentScheduledCount + newPostsCount
            
            // Utiliser PlanService pour obtenir la limite exacte
            const { PlanService } = await import('#services/plan_service')
            const planLimits = PlanService.getLimitsForPlan(user.plan)
            const maxPosts = planLimits.maxScheduledPosts
            
            if (PlanService.isLimitReached(totalAfterScheduling, maxPosts)) {
                user.isScheduledLimitReached = true
                await user.save()
                session.flash('error', `You have reached the free plan limit (${maxPosts} scheduled posts). Cannot schedule ${newPostsCount} more posts.`)
                return response.redirect('/schedule')
            }
        }

        // Vérifier que la date n'est pas dans le passé
        const scheduleDate = DateTime.fromISO(schedule_time)
        if (scheduleDate <= DateTime.now()) {
            console.log('[DEBUG] Schedule date is in the past')
            session.flash('error', 'Schedule time must be in the future')
            return response.redirect('/schedule')
        }

        try {
            // ✅ NOUVEAU: Traiter le rich text UNE SEULE FOIS avant les comptes multiples
            console.log('[DEBUG] Processing rich text for message...')
            const parsedRichText = await this.richTextService.parseText(message, explicitLinks)
            console.log('[DEBUG] Rich text processed:', { 
                facetsCount: parsedRichText.facets.length,
                explicitLinksCount: explicitLinks.length
            })

            // ✅ NOUVEAU: Traiter les médias UNE SEULE FOIS avant les comptes multiples
            console.log('[DEBUG] Processing media files once for all accounts...')
            const { imageUrls, videoUrls, altTexts, contentWarnings } = await this.extractMediaFromRequest(request)
            
            console.log('[DEBUG] Media processed for sharing:', { 
                imageCount: imageUrls.length, 
                videoCount: videoUrls.length 
            })

            // ✅ NOUVEAU: Créer les schedulings pour chaque compte avec les MÊMES médias et rich text
            const schedulePromises = accountIds.map(accountId => 
                this.createScheduleForAccount(accountId, message, schedule_time, imageUrls, videoUrls, altTexts, contentWarnings, parsedRichText, user)
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

    // ✅ MODIFIÉ: Méthode helper pour créer un schedule avec médias pré-traités et rich text
    private async createScheduleForAccount(
        accountId: string, 
        message: string, 
        schedule_time: string, 
        imageUrls: string[],
        videoUrls: string[],
        altTexts: string[],
        contentWarnings: string[],
        parsedRichText: { text: string; facets: any[] },
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
            let account: any
            if (platform === 'bluesky') {
                // ✅ CORRIGÉ: id est déjà une string, pas de parseInt
                account = await Account.findBy('id', id)
                
                // Vérifier que le compte appartient à l'utilisateur
                if (account && account.userId !== user.id.toString()) {
                    console.error('[DEBUG] Bluesky account unauthorized:', { accountUserId: account.userId, currentUserId: user.id })
                    account = null
                }
            } else if (platform === 'twitter') {
                // ✅ IMPLÉMENTÉ: TwitterAccount existe et fonctionne
                account = await TwitterAccount.findBy('id', parseInt(id))
                
                // Vérifier que le compte appartient à l'utilisateur
                if (account && account.userId !== user.id.toString()) {
                    console.error('[DEBUG] Twitter account unauthorized:', { accountUserId: account.userId, currentUserId: user.id })
                    account = null
                }
            } else {
                console.error('[DEBUG] Unknown platform:', platform)
                return { success: false, error: `Unknown platform: ${platform}` }
            }

            if (!account) {
                console.error('[DEBUG] Account not found:', { platform, id, userId: user.id })
                return { success: false, error: `Account not found: ${platform}:${id}` }
            }

            // ✅ MODIFIÉ: Utiliser les médias déjà traités au lieu de les traiter à nouveau
            console.log('[DEBUG] Using pre-processed media for account:', accountId, { 
                imageCount: imageUrls.length, 
                videoCount: videoUrls.length 
            })

            // Créer le scheduling
            const scheduling = new Scheduling()
            scheduling.userId = user.id
            
            // ✅ CORRIGÉ: Relations selon la plateforme
            if (platform === 'bluesky') {
                scheduling.account_id = account.id // STRING pour Bluesky
            } else if (platform === 'twitter') {
                scheduling.twitterAccountId = account.id // NUMBER pour Twitter
            }
            
            scheduling.message = message
            scheduling.scheduleTime = DateTime.fromISO(schedule_time)
            scheduling.status = 'pending'

            // ✅ NOUVEAU: Stocker les facets rich text (seulement pour Bluesky)
            if (platform === 'bluesky' && parsedRichText.facets.length > 0) {
                scheduling.facets = JSON.stringify(parsedRichText.facets)
                console.log('[DEBUG] Stored rich text facets for Bluesky:', parsedRichText.facets.length)
            }

            // ✅ Ajouter les médias PRÉ-TRAITÉS (mêmes pour tous les comptes)
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

            console.log('[DEBUG] Successfully created schedule for:', { platform, accountId: account.id })
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
                // ✅ Créer le dossier uploads s'il n'existe pas
                const fs = await import('fs')
                const path = await import('path')
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true })
                }

                for (let i = 0; i < uploadedImages.length; i++) {
                    const image = uploadedImages[i]
                    const imageName = `${Date.now()}_${i}_${image.clientName}`
                    await image.move('public/uploads', { name: imageName })
                    imageUrls.push(`/uploads/${imageName}`)
                }
            }

            const uploadedVideos = request.files('videos')
            if (uploadedVideos && uploadedVideos.length > 0) {
                // ✅ Créer le dossier videos s'il n'existe pas
                const fs = await import('fs')
                const path = await import('path')
                const videosDir = path.join(process.cwd(), 'public', 'videos')
                if (!fs.existsSync(videosDir)) {
                    fs.mkdirSync(videosDir, { recursive: true })
                }

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
        // ✅ FIX: Use scheduleId instead of id to match frontend payload
        const { scheduleId, message, schedule_time } = request.all()

        if (!scheduleId) {
            console.log('[DEBUG] No schedule ID provided for edit')
            session.flash('error', 'Schedule ID is required')
            return response.redirect('/schedule')
        }

        try {
            const scheduling = await Scheduling.findOrFail(scheduleId)
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

        // ✅ FIX: Read scheduleId from request body instead of params
        const { scheduleId } = request.all()
        console.log('[DEBUG] deletePost called with ID:', scheduleId)

        if (!scheduleId) {
            console.log('[DEBUG] No schedule ID provided')
            session.flash('error', 'Schedule ID is required')
            return response.redirect('/schedule')
        }

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
