import queue from "@rlanz/bull-queue/services/main";
import BotJob from "../jobs/bot_job.js";
import Account from "#models/account";
import User from "#models/user";

class QueueManager {
    public queue = queue
    public queueName = "listeners"
    constructor() {
        queue.getOrSet(this.queueName)
    }
    /**
     * Init alls jobs with for every users 
    */
    public async createAndStartListenersQueue() {
        const users = await User.query().preload("account")
        users.forEach(async (user) => {
            await this.createAJobForEachUserAccount(user.account)
        })
    }

    /**
     * Create one Job for one Account
     */
    public async createOneJob(account: Account) {
        this.queue.dispatch(BotJob, { account_id: account.id }, { queueName: this.queueName, repeat: { every: 10000 }, jobId: account.id })
    }

    /**
        * Create a Job for each user's account
    */
    public async createAJobForEachUserAccount(user_accounts: Account[]) {
        try {
            for (let account of user_accounts) {
                console.log("creating job for", account.id, "of", account.userId)
                await this.queue.dispatch(BotJob, { account_id: account.id }, { queueName: "listeners", repeat: { every: 10000 }, jobId: account.id })
            }
        } catch (err) {
            console.error("An error occurred while creating jobs:", err)
        }
    }
}

export default new QueueManager();
