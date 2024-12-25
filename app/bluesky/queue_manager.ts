import { Worker } from 'bullmq';
import Account from "#models/account";
import User from "#models/user";
import { Queue } from 'bullmq';
import handle from '../jobs/bot_job.js';
import redis from '@adonisjs/redis/services/main'
import env from '#start/env';

class QueueManager {
    public queueName = "listeners";
    public queue = new Queue(this.queueName, {
        connection: {
            family: 0,
            host: env.get("REDIS_HOST"),
            port: env.get("REDIS_PORT"),
            password: env.get("REDIS_PASSWORD")
        }
    })

    /**
     * Initializes jobs for all users and their accounts.
     */
    public async createAndStartListenersQueue(): Promise<void> {
        try {
            const users = await User.query().preload("account");
            await Promise.all(users.map((user) => this.createAJobForEachUserAccount(user.account)));
            new Worker('listeners', async job => {
                const account_id = job.data.account_id
                console.log("worker is calling a job with account:", account_id, "and job", job.id)
                if (!account_id) {
                    throw new Error(`account id is not defined for the worker`)
                }
                await handle({ account_id })
                const account = await Account.find(account_id)
                if (!account || !job.repeatJobKey) {
                    throw new Error(`account id is not defined for the worker`)
                }
                account.jobId = job.repeatJobKey
                account.save()
            }, {
                connection: {
                    family: 0,
                    host: env.get("REDIS_HOST"),
                    port: env.get("REDIS_PORT"),
                    password: env.get("REDIS_PASSWORD")
                }
            })
        } catch (err) {
            console.error("[ERROR] Failed to create and start listener queues:", err);
        }
    }

    /**
     * Creates a single job for a specific account.
     * @param account The account for which to create a job.
     */
    public async createOneJob(account: Account): Promise<void> {
        try {
            const account_id = account.id
            const job = await this.queue.add(`bot`, { account_id }, {
                repeat: { every: 10000 },
                jobId: account_id,
                repeatJobKey: account_id
            })
            console.log(job.id)
        } catch (err) {
            console.error(`[ERROR] Failed to create job for account ID: ${account.id}`, err);
        }
    }


    /**
     * Creates jobs for all accounts of a user.
     * @param user_accounts The accounts for which to create jobs.
     */
    public async createAJobForEachUserAccount(user_accounts: Account[]): Promise<void> {
        try {
            for (const account of user_accounts) {
                await this.createOneJob(account);
            }
        } catch (err) {
            console.error("[ERROR] Failed to create jobs for user accounts:", err);
        }
    }

    public async removeJob(account: Account) {
        const jobs = await redis.keys(`bull:${this.queueName}:repeat:${account.jobId}:*`)
        console.log(`got job :${jobs} with ${account.jobId}`)
        await redis.del(jobs)
    }
}

export default new QueueManager();
