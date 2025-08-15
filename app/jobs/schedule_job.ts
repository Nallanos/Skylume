import Scheduling from "#models/scheduling";
import AccountService from "#services/account_service";
import StreakService from "#services/streak_service";
import { AtpAgent } from '@atproto/api'
import { DateTime } from 'luxon'

interface ScheduleJobPayload {
    schedule_id: number
}

const handle = async (data: ScheduleJobPayload): Promise<void> => {
    try {
        const schedule = await Scheduling.find(data.schedule_id);

        if (!schedule) {
            throw new Error(`Schedule not found for ID: ${data.schedule_id}`);
        }

        // Load the schedule with platform-specific account relationships
        await schedule.load('account')
        await schedule.load('twitterAccount')

        // Determine platform and account based on which foreign key is set
        let platform: string
        let account: any
        let accountHandle: string

        if (schedule.account_id) {
            platform = 'bluesky'
            account = schedule.account
            accountHandle = account?.handle || 'unknown'
        } else if (schedule.twitterAccountId) {
            platform = 'twitter'
            account = schedule.twitterAccount
            accountHandle = account?.username || 'unknown'
        } else {
            throw new Error(`No valid account found for schedule ${schedule.id}`)
        }

        if (!account) {
            throw new Error(`${platform} account not found for schedule ${schedule.id}`)
        }

        console.log(`✅ Found scheduling ${schedule.id} for ${platform} account ${accountHandle}`)
        console.log(`[WORKER] 📤 About to publish post: "${schedule.message.slice(0, 50)}${schedule.message.length > 50 ? '...' : ''}"`)

        // Parse media data
        const images = schedule.images ? (Array.isArray(schedule.images) ? schedule.images : JSON.parse(schedule.images || '[]')) : []
        const altTexts = schedule.altTexts ? (Array.isArray(schedule.altTexts) ? schedule.altTexts : JSON.parse(schedule.altTexts || '[]')) : []
        const contentWarnings = schedule.contentWarnings ? (Array.isArray(schedule.contentWarnings) ? schedule.contentWarnings : JSON.parse(schedule.contentWarnings || '[]')) : []
        const videos = schedule.videos ? (Array.isArray(schedule.videos) ? schedule.videos : JSON.parse(schedule.videos || '[]')) : []
        const videoAltTexts = schedule.videoAltTexts ? (Array.isArray(schedule.videoAltTexts) ? schedule.videoAltTexts : JSON.parse(schedule.videoAltTexts || '[]')) : []

        console.log(`[WORKER] 📊 Media summary: ${images.length} images, ${videos.length} videos for ${platform}`)

        // Platform-specific posting logic
        if (platform === 'bluesky') {
            // Create AccountService instance for Bluesky posting
            const agent = new AtpAgent({ service: 'https://bsky.social' })
            const accountService = new AccountService(agent)
            await accountService.createOrResumeSession(account);
            
            // Use the new posting methods for better functionality
            if (videos.length > 0) {
                console.log(`[WORKER] 🎥 Posting video to Bluesky`)
                const mappedWarnings = contentWarnings.length > 0 ? contentWarnings.map((warning: string) => {
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
                }) : undefined;
                
                await accountService.postWithVideoPaths(
                    account, 
                    schedule.message, 
                    videos, 
                    videoAltTexts, 
                    mappedWarnings as any
                );
            } else if (contentWarnings.length > 0 && images.length > 0) {
                console.log(`[WORKER] 🖼️ Posting images with content warnings to Bluesky`)
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
                
                await accountService.postWithImagePaths(
                    account, 
                    schedule.message, 
                    images, 
                    altTexts, 
                    mappedWarnings as any
                );
            } else {
                console.log(`[WORKER] 📝 Posting to Bluesky`)
                await accountService.post(account, schedule.message, images, altTexts, contentWarnings);
            }
        } else if (platform === 'twitter') {
            console.log(`[WORKER] 🐦 Posting to Twitter`)
            
            try {
                // Check if account has Twitter credentials
                if (!account.accessToken) {
                    throw new Error(`TwitterAccount ${accountHandle} missing access token`)
                }
                
                // Create TwitterService with refresh token support
                const TwitterService = (await import('#services/twitter_service')).default
                const twitterService = await TwitterService.forTwitterAccountWithRefresh(account)
                
                // Post to Twitter using the createPost method
                const postId = await twitterService.createPost({
                    text: schedule.message,
                    media: [...images, ...videos], // ✅ CORRIGÉ: Inclure les vidéos aussi
                    altTexts: altTexts.length > 0 ? altTexts : undefined
                })
                
                console.log(`[WORKER] ✅ Successfully posted to Twitter: ${postId}`)
            } catch (twitterError) {
                console.error(`[WORKER] ❌ Failed to post to Twitter:`, twitterError)
                throw twitterError
            }
        }

        console.log(`[WORKER] ✅ Successfully posted to ${platform}`)
        schedule.status = "posted"
        await schedule.save()
        
        // Update user streak after successful post
        try {
            const streakService = new StreakService()
            await streakService.updateUserStreak(schedule.userId, DateTime.now())
            console.log(`[INFO] Updated streak for user ${schedule.userId} after posting schedule ${schedule.id}`)
        } catch (streakError) {
            console.error(`[ERROR] Failed to update streak for user ${schedule.userId}:`, streakError)
            // Don't fail the job if streak update fails
        }
        
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
