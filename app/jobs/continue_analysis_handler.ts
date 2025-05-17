import FollowerAnalysisService from "#services/follower_analysis_service"
import Account from "#models/account"
import type AccountService from "#services/account_service"

interface ContinueAnalysisPayload {
    accountId: string
    handle: string
}

/**
 * Handler for continuing account analysis periodically
 * This is used by BullMQ worker to process jobs from the continuous-analysis queue
 */
const continue_analysis = async (payload: ContinueAnalysisPayload, followerAnalysisService: FollowerAnalysisService, account_service: AccountService): Promise<any> => {
    const { accountId, handle } = payload

    try {
        const account = await Account.findOrFail(accountId)

        if (account.numbersOfFollowersAnalyzed != await account_service.getFollowersCount(account)) {
            await followerAnalysisService.analyzeFollowers(account)
        }

    }
    catch (error) {
        console.error(`Error in continuous analysis job for account ${handle}:`, error)
        throw error // Let BullMQ handle the retry logic
    }
}

export default continue_analysis
