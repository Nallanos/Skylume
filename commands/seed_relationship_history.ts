import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RelationshipHistory from '#models/relationship_history'
import Account from '#models/account'
import { DateTime } from 'luxon'

export default class SeedRelationshipHistory extends BaseCommand {
  static commandName = 'seed:relationship-history'
  static description = 'Seed relationship history data for testing'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('Starting relationship history seeding...')

    // Get all accounts
    const accounts = await Account.all()
    
    if (accounts.length === 0) {
      this.logger.warning('No accounts found. Please create some accounts first.')
      return
    }

    for (const account of accounts) {
      this.logger.info(`Seeding data for account: ${account.handle}`)
      
      // Get current counts (or use defaults if none exist)
      const baseValues = {
        mutual: Math.floor(Math.random() * 200) + 50, // 50-250
        i_follow_only: Math.floor(Math.random() * 150) + 30, // 30-180
        they_follow_only: Math.floor(Math.random() * 100) + 20, // 20-120
      }

      // Generate data for the last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = DateTime.now().minus({ days: i }).startOf('day')
        
        // Check if data already exists for this date
        const existingEntry = await RelationshipHistory
          .query()
          .where('account_id', account.id)
          .where('recorded_at', date.toJSDate())
          .first()

        if (existingEntry) {
          this.logger.info(`  - Skipping ${date.toFormat('yyyy-MM-dd')} (already exists)`)
          continue
        }

        // Generate progressive evolution
        const dayProgress = (29 - i) / 29
        const mutualGrowth = Math.floor(baseValues.mutual * (0.5 + dayProgress * 0.5) + (Math.random() * 20 - 10))
        const iFollowGrowth = Math.floor(baseValues.i_follow_only * (0.7 + dayProgress * 0.3) + (Math.random() * 15 - 7))
        const theyFollowGrowth = Math.floor(baseValues.they_follow_only * (0.8 + dayProgress * 0.2) + (Math.random() * 10 - 5))

        const mutual = Math.max(0, mutualGrowth)
        const iFollowOnly = Math.max(0, iFollowGrowth)
        const theyFollowOnly = Math.max(0, theyFollowGrowth)
        const total = mutual + iFollowOnly + theyFollowOnly

        await RelationshipHistory.create({
          accountId: account.id,
          mutualCount: mutual,
          iFollowOnlyCount: iFollowOnly,
          theyFollowOnlyCount: theyFollowOnly,
          totalCount: total,
          recordedAt: date
        })

        this.logger.info(`  - Created entry for ${date.toFormat('yyyy-MM-dd')}: M:${mutual}, I:${iFollowOnly}, T:${theyFollowOnly}`)
      }
    }

    this.logger.success('Relationship history seeding completed!')
  }
}