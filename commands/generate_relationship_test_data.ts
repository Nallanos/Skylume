import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RelationshipHistory from '../app/models/relationship_history.js'
import Account from '../app/models/account.js'
import { DateTime } from 'luxon'

export default class GenerateRelationshipTestData extends BaseCommand {
  static commandName = 'generate:relationship-test-data'
  static description = 'Generate test data for relationship histories'

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Generating relationship test data...')

    // Get all accounts
    const accounts = await Account.all()

    if (accounts.length === 0) {
      this.logger.error('No accounts found. Please create some accounts first.')
      return
    }

    for (const account of accounts) {
      this.logger.info(`Generating data for account: ${account.handle || account.did}`)

      // Base values for this account (simulate realistic relationship counts)
      const baseMutual = Math.floor(Math.random() * 50) + 20 // 20-70 mutual follows
      const baseIFollow = Math.floor(Math.random() * 30) + 10 // 10-40 I follow only
      const baseTheyFollow = Math.floor(Math.random() * 40) + 15 // 15-55 they follow only

      // Generate data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = DateTime.now().minus({ days: i }).startOf('day')

        // Simulate gradual changes over time
        const dayProgress = (6 - i) / 6
        const mutualVariation = Math.floor(Math.random() * 4 - 2) // ±2 variation
        const iFollowVariation = Math.floor(Math.random() * 3 - 1) // ±1 variation
        const theyFollowVariation = Math.floor(Math.random() * 3 - 1) // ±1 variation

        const mutualCount = Math.max(0, baseMutual + Math.floor(dayProgress * 5) + mutualVariation)
        const iFollowCount = Math.max(0, baseIFollow + Math.floor(dayProgress * 2) + iFollowVariation)
        const theyFollowCount = Math.max(0, baseTheyFollow + Math.floor(dayProgress * 3) + theyFollowVariation)
        const totalCount = mutualCount + iFollowCount + theyFollowCount

        // Check if record already exists for this account and date
        const existingRecord = await RelationshipHistory.query()
          .where('account_id', account.id)
          .where('recorded_at', date.toSQLDate())
          .first()

        if (existingRecord) {
          // Update existing record
          existingRecord.mutualCount = mutualCount
          existingRecord.iFollowOnlyCount = iFollowCount
          existingRecord.theyFollowOnlyCount = theyFollowCount
          existingRecord.totalCount = totalCount
          await existingRecord.save()
          this.logger.info(`Updated record for ${date.toFormat('yyyy-MM-dd')}`)
        } else {
          // Create new record
          await RelationshipHistory.create({
            accountId: account.id,
            mutualCount,
            iFollowOnlyCount: iFollowCount,
            theyFollowOnlyCount: theyFollowCount,
            totalCount,
            recordedAt: date,
          })
          this.logger.info(`Created record for ${date.toFormat('yyyy-MM-dd')}`)
        }
      }
    }

    this.logger.success('Test data generation completed!')
  }
}