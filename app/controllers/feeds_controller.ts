import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import { FeedService } from '#services/feed_service'
import AccountManager from '#services/account_manager'
import { inject } from '@adonisjs/core'
import Feed from '#models/feed'
import { DateTime } from 'luxon'

@inject()
export default class FeedsController {

    constructor(protected feedService: FeedService, protected account_manager: AccountManager) { }

    public async processPosts({ request, response, auth, inertia }: HttpContext) {
        try {
            const feedId = request.params().id
            const user = auth.getUserOrFail()

            const userFeeds = await Feed.query().where('user_id', user.id)

            if (!feedId) {
                if (userFeeds.length === 0) {
                    return response.redirect(`/feed`)
                }
                return response.redirect(`/feed`)
            }

            const feed = await Feed.findOrFail(feedId)
            const account = await Account.findOrFail(feed.account_id)
            
            // Render the page immediately with loading state
            return inertia.render('feedId', {
                posts: [],
                currentFeedId: feed.id,
                keywordCursor: new Map(Object.entries(feed.keywordsCursor)),
                account: {
                    id: account.id,
                    handle: account.handle,
                    did: account.did,
                },
                isLoading: true,
                processingTime: null,
            })
        } catch (error) {
            console.error("Error processing posts:", error)
            return response.redirect().back()
        }
    }

    public async getPertinentPosts({ inertia, auth }: HttpContext) {
        const user = auth.getUserOrFail()
        const userFeeds = await Feed.query().where('user_id', user.id)
        
        return inertia.render('feeds', {
            feeds: userFeeds
        })
    }

    public async createFeed({ request, response, auth }: HttpContext) {
        try {
            let { account_id, keywords } = request.only(['account_id', 'keywords']) as { account_id: string, keywords: string }
            const user = auth.getUserOrFail()
            const account = await Account.findOrFail(account_id)
            let keywordCursor = new Map<string, string | null>()
            keywords = keywords.trim()

            for (const keyword of keywords.split(',')) {
                keywordCursor.set(keyword.trim(), "")
            }
            const feed = await Feed.create({
                account_id,
                keywordsCursor: Object.fromEntries(keywordCursor),
                userId: user.id,
                accountHandle: account.handle,
            })
            console.log("feed", feed.keywordsCursor)
            return response.redirect().toPath(`/feed/`)

        } catch (error) {
            console.error("Error creating feed:", error)
            return response.redirect().back()
        }
    }

    public async processPostsAsync({ request, response, auth }: HttpContext) {
        try {
            const feedId = request.params().id
            auth.getUserOrFail() // Verify authentication
            
            // Get optional filter parameters from query string
            const minEngagement = request.input('minEngagement') ? Number(request.input('minEngagement')) : undefined
            const minDate = request.input('minDate') || undefined
            
            const feed = await Feed.findOrFail(feedId)
            const account = await Account.findOrFail(feed.account_id)
            
            // Mark feed as processing
            feed.isProcessing = true
            await feed.save()
            
            const startTime = Date.now()
            console.log(`Starting async post processing for feed ${feedId}`)
            if (minEngagement || minDate) {
                console.log(`Applying filters - minEngagement: ${minEngagement}, minDate: ${minDate}`)
            }
            
            try {
                const accountService = await this.account_manager.createAccountService(account)
                
                const filters = (minEngagement || minDate) ? {
                    minEngagement,
                    minDate
                } : undefined
                
                const data = await this.feedService.getPertinentPosts(
                    accountService,
                    account,
                    feed,
                    filters
                )

                const processingTime = Date.now() - startTime
                console.log(`Async post processing completed in ${processingTime}ms`)
                
                // Update feed with new data and mark as not processing
                feed.keywordsCursor = Object.fromEntries(data.keywordCursor)
                feed.isProcessing = false
                feed.lastProcessedAt = DateTime.now()
                await feed.save()

                return response.json({
                    success: true,
                    posts: data.sortedMatchPosts.slice(0, 30),
                    totalPosts: data.sortedMatchPosts.length,
                    processingTime: processingTime,
                    keywordCursor: Object.fromEntries(data.keywordCursor),
                })
            } catch (processingError) {
                console.error("Error during post processing:", processingError)
                
                // Mark feed as not processing on error
                feed.isProcessing = false
                await feed.save()
                
                return response.status(500).json({
                    success: false,
                    error: 'Failed to process posts',
                    processingTime: Date.now() - startTime
                })
            }
        } catch (error) {
            console.error("Error in async post processing:", error)
            return response.status(500).json({
                success: false,
                error: 'Internal server error'
            })
        }
    }

    public async deleteFeed({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const feedId = params.id
            const feed = await Feed.query()
                .where('id', feedId)
                .where('userId', user.id)
                .firstOrFail()
            
            await feed.delete()
            return response.redirect('/feed')
        } catch (error) {
            console.error("Error deleting feed:", error)
            return response.redirect().back()
        }
    }
}