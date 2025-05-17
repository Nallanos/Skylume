import { Queue, Worker } from 'bullmq'
import * as IORedis from 'ioredis'
import env from '#start/env'
import Account from '#models/account'
import continue_analysis from '../jobs/continue_analysis_handler.js'
import AccountManager from './account_manager.js'
import { inject } from '@adonisjs/core'
import FollowerAnalysisService from './follower_analysis_service.js'
/**
 * QueueManager class to handle BullMQ queues for account analysis
 * Singleton pattern similar to account_manager
 */
@inject()
export class QueueManager {
  private jobMap: Map<string, string> = new Map() // Maps accountId to jobId
  private continuousAnalysisQueue: Queue
  private connection: IORedis.Redis
  private worker: Worker

  constructor(protected accountManager: AccountManager, protected followerAnalysisService: FollowerAnalysisService) {
    // Configure Redis connection
    this.connection = new IORedis.Redis(
      Number(env.get('REDIS_PORT', 6379)),
      String(env.get('REDIS_HOST', '127.0.0.1')),
      {
        password: env.get('REDIS_PASSWORD', '') || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      }
    )

    this.continuousAnalysisQueue = new Queue('continuous-analysis', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100
      }
    })

    // Initialize worker for the continuous analysis
    this.worker = new Worker('continuous-analysis', async (job) => {
      console.log("Processing continuous analysis job")
      const { accountId, handle } = job.data
      const account = await Account.findOrFail(accountId)
      await continue_analysis({ accountId, handle }, this.followerAnalysisService, await this.accountManager.getOrCreateAccountService(account))
    }, {
      connection: this.connection,
      concurrency: 5
    })

    console.log('Queue manager initialized with BullMQ')
  }

  /**
   * Schedule a recurring analysis job for an account
   */
  public async scheduleRecurringAnalysis(account: Account): Promise<string> {
    try {
      if (!account || !account.id || !account.handle || !account.userId) {
        throw new Error('Invalid account: Cannot schedule analysis for null account')
      }

      await this.removeRecurringAnalysis(account.id)

      console.log(`Scheduling recurring analysis for account ${account.handle} (${account.id})`)
      const job = await this.continuousAnalysisQueue.add('continue-analysis', {
        accountId: account.id,
        handle: account.handle,
      }, {
        repeat: {
          every: 3 * 60 * 1000,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        jobId: account.handle
      })
      console.log(`job created with ${JSON.stringify(job.data)}`)
      const jobId = job?.id?.toString() || `recurring-${account.id}`
      this.jobMap.set(account.id, jobId)

      return jobId
    } catch (error) {
      console.error(`Failed to schedule recurring analysis for account ${account.handle}:`, error)
      throw error
    }
  }

  /**
   * Remove an analysis job for a specific account
   */
  public async removeRecurringAnalysis(accountId: string): Promise<void> {
    const jobId = this.jobMap.get(accountId)
    if (jobId) {
      try {
        // Get all repeatable jobs
        const repeatableJobs = await this.continuousAnalysisQueue.getRepeatableJobs()

        // Find the repeatable job for this account
        for (const job of repeatableJobs) {
          if (job.id && (job.id === jobId || job.id.includes(accountId))) {
            // Found the job, now remove it using key
            await this.continuousAnalysisQueue.removeRepeatableByKey(job.key)
            console.log(`Removed recurring analysis job for account ID ${accountId}`)
            break
          }
        }

        // Clean up the map
        this.jobMap.delete(accountId)
      }
      catch (error) {
        console.error(`Failed to remove analysis job for account ${accountId}:`, error)
        throw error
      }
    }
  }

  /**
   * Remove all jobs for a specific account (used when deleting an account)
   */
  public async removeAllJobsForAccount(accountId: string): Promise<void> {
    try {
      // First remove any repeatable jobs
      await this.removeRecurringAnalysis(accountId)

      // Then clean up any pending jobs from both queues
      const continuousJobs = await this.continuousAnalysisQueue.getJobs(['waiting', 'active', 'delayed'])

      const allJobs = [...continuousJobs]

      for (const job of allJobs) {
        if (job.data.accountId === accountId) {
          await job.remove()
          console.log(`Removed job ${job.id} for account ${accountId}`)
        }
      }
    } catch (error) {
      console.error(`Failed to clean up jobs for account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Shutdown the queue manager (used when closing the application)
   */
  public async shutdown(): Promise<void> {
    try {
      // Close all resources
      await this.worker.close()
      await this.continuousAnalysisQueue.close()
      await this.connection.quit()

      console.log('Queue manager shut down successfully')
    } catch (error) {
      console.error('Error during queue manager shutdown:', error)
      throw error
    }
  }
}

