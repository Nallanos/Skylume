import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import AccountService from '#services/account_service'
import users_bot_service_manager from '../bluesky/users_bot_service_manager.js'
import Follower from '#models/follower'
import * as tf from '@tensorflow/tfjs';


import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
export default class FollowerAnalysisController {
    public async AnalyzeFollowers({ request, response, auth, inertia }: HttpContext) {
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

        //this.processPython(accountService, account)
        return await inertia.render()
    }

    private cosineSimilarityTF(a: number[], b: number[]): number {
        const vecA = tf.tensor1d(a);
        const vecB = tf.tensor1d(b);

        const sim = tf.losses.cosineDistance(vecA, vecB, 0).dataSync()[0];
        return 1 - sim; // Parce que `cosineDistance` retourne 1 - cosSim
    }

    private async processPython(accountService: AccountService, account: Account) {
        let cursor: string | undefined = ''

        while (true) {
            const res = await accountService.getFollowers(account, account.handle, cursor)
            cursor = res.cursor
            let followers: ProfileView[] = res.followers

            // Mise à jour du curseur pour l'account
            account.numbersOfFollowersAnalyzed += followers.length
            if (account.followersCursor != cursor && cursor) {
                account.followersCursor = cursor
                await account.save()
            }


            const pythonRes = await fetch("http://0.0.0.0:8000/tagAllAccountFollowers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    account_handle: account.handle,
                    followers: followers
                }),
            });

            const data = await pythonRes.json() as pythonRes
            console.log(data)


            if (!res.cursor) {
                break
            }
        }
    }
}

type pythonRes = {
    tag: string,
    handles: string,
    embedding: number[]
    size: number
}