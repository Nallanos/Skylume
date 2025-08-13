import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class IncrementStreak extends BaseCommand {
  static commandName = 'increment:streak'
  static description = 'Increment a user streak by 1 day'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🚀 Starting streak increment command')

    // Prompt for user ID or handle
    const userIdentifier = await this.prompt.ask('Enter user ID or handle', {
      validate: (value) => {
        if (!value || value.trim() === '') {
          return 'User identifier is required'
        }
        return true
      },
    })

    try {
      // Find user by ID or handle
      let user: User | null = null
      
      if (/^\d+$/.test(userIdentifier)) {
        // It's a numeric ID
        user = await User.find(userIdentifier)
      } else {
        // It's a handle, search in related accounts
        user = await User.query()
          .whereHas('account', (accountQuery) => {
            accountQuery.where('handle', userIdentifier)
          })
          .first()
      }

      if (!user) {
        this.logger.error(`❌ User not found: ${userIdentifier}`)
        return
      }

      this.logger.info(`👤 Found user: ${user.email}`)

      // Show current streak info
      const currentStreak = user.currentStreak || 0
      const longestStreak = user.longestStreak || 0
      const lastPostDate = user.lastPostDate
      
      this.logger.info(`📊 Current streak: ${currentStreak} days`)
      this.logger.info(`🏆 Longest streak: ${longestStreak} days`)
      this.logger.info(`📅 Last post date: ${lastPostDate?.toFormat('yyyy-MM-dd') || 'Never'}`)

      // Confirm the action
      const confirm = await this.prompt.confirm(
        `Are you sure you want to increment the streak for this user?`
      )

      if (!confirm) {
        this.logger.info('❌ Operation cancelled')
        return
      }

      // Calculate new streak values
      const now = DateTime.now()
      const newCurrentStreak = currentStreak + 1
      const newLongestStreak = Math.max(longestStreak, newCurrentStreak)

      // Update user
      user.currentStreak = newCurrentStreak
      user.longestStreak = newLongestStreak
      user.lastPostDate = now
      
      // Set streak start date if this is the first day
      if (currentStreak === 0) {
        user.streakStartDate = now
      }

      await user.save()

      // Show updated values
      this.logger.info('✅ Streak updated successfully!')
      this.logger.info(`📊 New current streak: ${newCurrentStreak} days`)
      this.logger.info(`🏆 New longest streak: ${newLongestStreak} days`)
      this.logger.info(`📅 Updated last post date: ${now.toFormat('yyyy-MM-dd HH:mm:ss')}`)

      // Check for milestones
      const milestones = [7, 14, 30, 60, 90, 180, 365]
      const reachedMilestone = milestones.find(m => m === newCurrentStreak)
      
      if (reachedMilestone) {
        this.logger.info(`🎉 Milestone reached: ${reachedMilestone} days!`)
      }

    } catch (error) {
      this.logger.error('❌ Error incrementing streak:', error.message)
    }
  }
}
