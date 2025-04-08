import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AccountService from '#services/account_service'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
import AI_services from '#services/AI_services'

export default class FollowerAnalysisController {
    public async AnalyzeFollowers({ request, response, auth }: HttpContext) {
        const user = auth.user
        if (!user) {
            console.error("User not authenticated")
            return response.redirect("/dashboard")
        }

        const userService = await users_bot_service_manager.getUserBotService(user.id)

        const accountService = new AccountService(userService.agent)

        const accountId = request.params().id
        const account = await Account.findOrFail(accountId)
        if (!account) {
            return response.redirect("/dashboard")
        }

        await accountService.createOrResumeSession(account)
        const followersCount = await accountService.getFollowersCount(account)

        if (followersCount == account.numbersOfFollowersAnalyzed)
            return response.redirect().back()

        const res = await accountService.getFollowers(account, account.handle, account.followersCursor)

        const analysedFollowers = await AI_services.getClassifiedFollowers(userService.agent, res.followers)

        console.log("Followers", analysedFollowers)
    }
}