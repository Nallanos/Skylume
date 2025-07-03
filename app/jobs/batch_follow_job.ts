import Account from '#models/account'
import AccountManager from '#services/account_manager'
import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'

interface BatchFollowPayload {
  accountId: string
  userDids: string[]
  jobId: string
}

@inject()
export default class BatchFollowJob {
  constructor(protected accountManager: AccountManager) { }

  async handle(payload: BatchFollowPayload) {
    const { accountId, userDids, jobId } = payload

    console.log(`Starting batch follow job ${jobId} for ${userDids.length} users`)

    try {
      // Get account
      const account = await Account.findOrFail(accountId)
      const accountService = await this.accountManager.getOrCreateAccountService(account)
      await accountService.createOrResumeSession(account)

      // Initialize progress tracking
      const progressKey = `batch_follow_progress:${jobId}`
      await redis.setex(progressKey, 3600, JSON.stringify({
        accountId: accountId,
        status: 'running',
        total: userDids.length,
        completed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startedAt: new Date().toISOString()
      }))

      const results = []
      let successCount = 0
      let completedCount = 0

      for (const did of userDids) {
        try {
          // Check if job has been cancelled
          const currentProgressData = await redis.get(progressKey)
          if (currentProgressData) {
            const currentProgress = JSON.parse(currentProgressData)
            if (currentProgress.status === 'cancelled') {
              console.log(`Batch follow job ${jobId} was cancelled, stopping execution`)
              return
            }
          }

          // Rate limiting: 500ms between actions (much faster while staying safe)
          if (completedCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }

          const success = await accountService.followUser(account, did)

          if (success) {
            successCount++
            results.push({ did, success: true })
          } else {
            results.push({ did, success: false, error: 'Already following this user' })
          }

          completedCount++

          // Update progress
          await redis.setex(progressKey, 3600, JSON.stringify({
            accountId: accountId,
            status: 'running',
            total: userDids.length,
            completed: completedCount,
            successful: successCount,
            failed: completedCount - successCount,
            errors: results.filter(r => !r.success).map(r => r.error),
            currentDid: did,
            updatedAt: new Date().toISOString()
          }))

        } catch (error) {
          results.push({ did, success: false, error: error.message })
          completedCount++

          // Update progress with error
          await redis.setex(progressKey, 3600, JSON.stringify({
            accountId: accountId,
            status: 'running',
            total: userDids.length,
            completed: completedCount,
            successful: successCount,
            failed: completedCount - successCount,
            errors: [...results.filter(r => !r.success).map(r => r.error), error.message],
            currentDid: did,
            updatedAt: new Date().toISOString()
          }))
        }
      }

      // Mark job as completed
      await redis.setex(progressKey, 3600, JSON.stringify({
        accountId: accountId,
        status: 'completed',
        total: userDids.length,
        completed: completedCount,
        successful: successCount,
        failed: completedCount - successCount,
        errors: results.filter(r => !r.success).map(r => r.error),
        results: results,
        completedAt: new Date().toISOString()
      }))

      console.log(`Batch follow job ${jobId} completed: ${successCount}/${userDids.length} successful`)

      // Clear cache for this account to force refresh
      const cacheKey = `follower_relationships:${account.did || account.handle}`
      await redis.del(cacheKey)

    } catch (error) {
      console.error(`Batch follow job ${jobId} failed:`, error)

      // Mark job as failed
      const progressKey = `batch_follow_progress:${jobId}`
      await redis.setex(progressKey, 3600, JSON.stringify({
        accountId: accountId,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      }))

      throw error
    }
  }
}
