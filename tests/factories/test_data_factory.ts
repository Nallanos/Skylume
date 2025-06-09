import { DateTime } from 'luxon'
import User from '#models/user'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import type { AnalysisProgress, AnalysisStatus } from '#models/analysis_audience'

/**
 * Factory for creating test data to replace create_test_data.mjs functionality
 */
export class TestDataFactory {
  /**
   * Create a test user
   */
  static async createTestUser(overrides: Partial<{
    email: string
    plan: string
    password: string
  }> = {}) {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)

    return await User.create({
      id: `test-user-${timestamp}-${random}`,
      email: overrides.email || `test-${timestamp}-${random}@example.com`,
      password: overrides.password || 'hashed_password',
      plan: overrides.plan || 'pro',
      dmsSent: 0,
      isScheduledLimitReached: false,
      isDmsLimitReached: false,
      ...overrides
    })
  }

  /**
   * Create a test account for a user
   */
  static async createTestAccount(userId: string, overrides: Partial<{
    handle: string
    did: string
    appPassword: string
    followers_count: number
    numbersOfFollowersAnalyzed: number
  }> = {}) {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)

    return await Account.create({
      id: `test-account-${timestamp}-${random}`,
      userId: userId,
      handle: overrides.handle || `testuser-${timestamp}-${random}.bsky.social`,
      did: overrides.did || 'did:plc:test123',
      appPassword: overrides.appPassword || 'test-password',
      session: '{}',
      seenNotificationAt: DateTime.now().toString(),
      isRateLimited: false,
      ...overrides
    })
  }

  /**
   * Create a test analysis for an account
   */
  static async createTestAnalysis(accountId: string, overrides: Partial<{
    accountHandle: string
    status: AnalysisStatus
    progress: AnalysisProgress
    result: any
    errorMessage: string
  }> = {}) {
    // Get the account to retrieve its handle if not provided
    const account = await Account.findOrFail(accountId)

    // Prepare the progress object - the model will JSON.stringify it automatically
    const progressData = overrides.progress || { analyzed: 0, total: 100, percentage: 0 }

    return await AnalysisAudience.create({
      accountId: accountId,
      accountHandle: overrides.accountHandle || account.handle,
      status: overrides.status || 'pending',
      queueJobId: null,
      progress: progressData,
      result: overrides.result || { clusters: [], insights: [] },
      errorMessage: overrides.errorMessage || null,
      startedAt: null,
      completedAt: null,
      ...overrides
    })
  }

  /**
   * Create complete test data set (user + account + analysis)
   * This replaces the functionality from create_test_data.mjs
   */
  static async createCompleteTestData(overrides: {
    user?: Partial<Parameters<typeof TestDataFactory.createTestUser>[0]>
    account?: Partial<Parameters<typeof TestDataFactory.createTestAccount>[1]>
    analysis?: Partial<Parameters<typeof TestDataFactory.createTestAnalysis>[1]>
  } = {}) {
    const user = await TestDataFactory.createTestUser(overrides.user)
    const account = await TestDataFactory.createTestAccount(user.id, overrides.account)
    const analysis = await TestDataFactory.createTestAnalysis(account.id, overrides.analysis)

    return {
      user,
      account,
      analysis,
      userId: user.id,
      accountId: account.id,
      analysisId: analysis.id
    }
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Delete in reverse order due to foreign key constraints
    await AnalysisAudience.query().where('account_id', 'like', 'test-account-%').delete()
    await Account.query().where('id', 'like', 'test-account-%').delete()
    await User.query().where('id', 'like', 'test-user-%').delete()
  }
}
