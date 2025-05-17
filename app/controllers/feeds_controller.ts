import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import { FeedService } from '#services/feed_service'
import AccountManager from '#services/account_manager'
import { inject } from '@adonisjs/core'
import Feed from '#models/feed'

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
            const accountService = await this.account_manager.getOrCreateAccountService(account)
            const data = await this.feedService.getPertinentPosts(
                accountService,
                account,
                feed
            )

            console.log("sortedMatchPosts", data.sortedMatchPosts)
            feed.keywordsCursor = Object.fromEntries(data.keywordCursor)
            await feed.save()

            return inertia.render('feedId', {
                posts: data.sortedMatchPosts.slice(0, 30),
                currentFeedId: feed.id,
                keywordCursor: data.keywordCursor,
                account: {
                    id: account.id,
                    handle: account.handle,
                    did: account.did,
                },
            })
        } catch (error) {
            console.error("Error processing posts:", error)
            return response.redirect().back()
        }
    }

    public async getPertinentPosts({ inertia }: HttpContext) {
        return inertia.render('feedId', {
            posts: [],
            currentFeedId: null
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
}