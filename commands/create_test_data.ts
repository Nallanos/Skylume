import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { TestDataFactory } from '#tests/factories/test_data_factory'

export default class CreateTestData extends BaseCommand {
  static commandName = 'create:test-data'
  static description = 'Create test data for audience analysis workflow (replaces create_test_data.mjs)'

  @args.string({ description: 'Type of test data: complete, user, account, or analysis', required: false })
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
        default:
          this.logger.error(`❌ Unknown data type: ${dataType}`)
          this.logger.info('Available types: complete, user, account, analysis')
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
}