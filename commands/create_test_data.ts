import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { TestDataFactory } from '#tests/factories/test_data_factory'

export default class CreateTestData extends BaseCommand {
  static commandName = 'create:test-data'
  static description = 'Create test data for audience analysis workflow (replaces create_test_data.mjs)'

  @args.string({ description: 'Type of test data: complete, user, account, analysis, or real', required: false })
  declare type: string

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const dataType = this.type || 'complete'

    try {
      this.logger.info('🚀 Starting test data creation...')

      switch (dataType.toLowerCase()) {
        case 'complete':
          await this.createCompleteTestData()
          break
        case 'user':
          await this.createUserOnly()
          break
        case 'account':
          await this.createAccountOnly()
          break
        case 'analysis':
          await this.createAnalysisOnly()
          break
        case 'real':
          await this.createRealAccountAnalysis()
          break
        default:
          this.logger.error(`❌ Unknown data type: ${dataType}`)
          this.logger.info('Available types: complete, user, account, analysis, real')
          return
      }

      this.logger.success('✅ Test data creation completed successfully!')

    } catch (error) {
      this.logger.error(`❌ Failed to create test data: ${error.message}`)
      this.exitCode = 1
    }
  }

  private async createCompleteTestData() {
    const { user, account, analysis, userId, accountId, analysisId } =
      await TestDataFactory.createCompleteTestData()

    this.logger.info(`✅ Created test user: ${userId} (${user.email})`)
    this.logger.info(`✅ Created test account: ${accountId} (${account.handle})`)
    this.logger.info(`✅ Created test analysis: ${analysisId}`)

    this.logger.info(`
📊 Complete test data created successfully!
- User ID: ${userId}
- Account ID: ${accountId}  
- Analysis ID: ${analysisId}

Next steps:
1. Use the API endpoints to queue analysis
2. Test the Python worker endpoints with real data
3. Verify the complete workflow from queue → worker → completion

Use this data with the test commands:
- node ace test:workflow
- node ace test:api
    `)
  }

  private async createUserOnly() {
    const user = await TestDataFactory.createTestUser()
    this.logger.success(`✅ Created test user: ${user.id} (${user.email})`)
  }

  private async createAccountOnly() {
    const user = await TestDataFactory.createTestUser()
    const account = await TestDataFactory.createTestAccount(user.id)
    this.logger.success(`✅ Created test account: ${account.id} (${account.handle}) for user ${user.id}`)
  }

  private async createAnalysisOnly() {
    const user = await TestDataFactory.createTestUser()
    const account = await TestDataFactory.createTestAccount(user.id)
    const analysis = await TestDataFactory.createTestAnalysis(account.id)
    this.logger.success(`✅ Created test analysis: ${analysis.id} for account ${account.id}`)
  }

  private async createRealAccountAnalysis() {
    const Account = (await import('#models/account')).default
    const AnalysisAudience = (await import('#models/analysis_audience')).default

    this.logger.info('🔍 Looking for allanbe.bsky.social account...')

    // Find the existing account
    const account = await Account.query()
      .where('handle', 'allanbe.bsky.social')
      .first()

    if (!account) {
      this.logger.error('❌ Account allanbe.bsky.social not found in database')
      this.logger.info('💡 Make sure the account exists first, or create it manually')
      return
    }

    this.logger.success(`✅ Found account: ${account.id} (${account.handle})`)

    // Create an analysis for this account
    this.logger.info('📊 Creating analysis...')
    const analysis = await AnalysisAudience.create({
      accountId: account.id,
      accountHandle: account.handle,
      status: 'pending',
      queueJobId: null,
      progress: { analyzed: 0, total: 100, percentage: 0 },
      result: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null
    })

    this.logger.success(`✅ Created analysis: ${analysis.id} for account ${account.handle}`)
    this.logger.info(`📊 You can now test with analysis ID: ${analysis.id}`)
  }
}