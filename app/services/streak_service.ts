import { DateTime } from 'luxon'
import User from '#models/user'
import StreakLog from '#models/streak_log'

export default class StreakService {
  /**
   * Update user's streak when they successfully post
   */
  async updateUserStreak(userId: string, postDate: DateTime = DateTime.now()): Promise<void> {
    try {
      const user = await User.findOrFail(userId)
      const postDay = postDate.startOf('day')
      
      console.log(`[STREAK] Updating streak for user ${userId} on ${postDay.toISODate()}`)
      
      // Calculate new streak values
      const { currentStreak, longestStreak, streakStartDate } = this.calculateNewStreak(user, postDay)
      
      // Update user streak data
      user.currentStreak = currentStreak
      user.longestStreak = Math.max(longestStreak, user.longestStreak || 0)
      user.lastPostDate = postDay
      user.streakStartDate = streakStartDate
      
      await user.save()
      
      // Log the streak activity for future gamification
      await this.logStreakActivity(userId, postDay, currentStreak)
      
      console.log(`[STREAK] User ${userId} streak updated: ${currentStreak} days (longest: ${user.longestStreak})`)
      
    } catch (error) {
      console.error(`[STREAK] Error updating streak for user ${userId}:`, error)
      // Don't throw error to avoid breaking the post publishing flow
    }
  }

  /**
   * Check current streak status for a user
   */
  async checkStreakStatus(userId: string): Promise<{
    currentStreak: number
    longestStreak: number
    isActive: boolean
    status: 'active' | 'at-risk' | 'broken'
    lastPostDate: DateTime | null
  }> {
    const user = await User.findOrFail(userId)
    
    return {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      isActive: user.isStreakActive,
      status: user.streakStatus,
      lastPostDate: user.lastPostDate
    }
  }

  /**
   * Get streak history for a user (for future analytics)
   */
  async getStreakHistory(userId: string, days: number = 30): Promise<StreakLog[]> {
    const endDate = DateTime.now()
    const startDate = endDate.minus({ days })
    
    return await StreakLog
      .query()
      .where('userId', userId)
      .whereBetween('date', [startDate.toISODate(), endDate.toISODate()])
      .orderBy('date', 'desc')
  }

  /**
   * Calculate new streak based on posting pattern
   */
  private calculateNewStreak(user: User, postDate: DateTime): {
    currentStreak: number
    longestStreak: number
    streakStartDate: DateTime
  } {
    const lastPostDate = user.lastPostDate?.startOf('day')
    
    let currentStreak = 1
    let streakStartDate = postDate
    
    if (lastPostDate) {
      // If posting on the same day, maintain current streak
      if (lastPostDate.equals(postDate)) {
        return {
          currentStreak: user.currentStreak || 1,
          longestStreak: user.longestStreak || 1,
          streakStartDate: user.streakStartDate || postDate
        }
      }
      
      // If posting on consecutive days, increment streak
      if (this.isConsecutiveDay(lastPostDate, postDate)) {
        currentStreak = (user.currentStreak || 0) + 1
        streakStartDate = user.streakStartDate || postDate
      } else {
        // Streak is broken, start new streak
        currentStreak = 1
        streakStartDate = postDate
      }
    }
    
    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, user.longestStreak || 0),
      streakStartDate
    }
  }

  /**
   * Check if two dates are consecutive days
   */
  private isConsecutiveDay(lastDate: DateTime, currentDate: DateTime): boolean {
    const daysDiff = Math.abs(currentDate.diff(lastDate, 'days').days)
    return daysDiff === 1
  }

  /**
   * Log streak activity for future gamification and analytics
   */
  private async logStreakActivity(userId: string, date: DateTime, streak: number): Promise<void> {
    try {
      const dateStr = date.toISODate()
      if (!dateStr) return
      
      // Check if log already exists for this day
      const existingLog = await StreakLog
        .query()
        .where('userId', userId)
        .where('date', dateStr)
        .first()
      
      if (existingLog) {
        // Update post count for the day
        existingLog.postsCount += 1
        await existingLog.save()
      } else {
        // Create new log entry
        await StreakLog.create({
          userId,
          date,
          postsCount: 1,
          milestoneReached: this.checkMilestone(streak),
          specialComment: null // Future: add motivational messages
        })
      }
    } catch (error) {
      console.error(`[STREAK] Error logging streak activity:`, error)
      // Don't throw to avoid breaking the main flow
    }
  }

  /**
   * Check if current streak reaches a milestone
   */
  private checkMilestone(streak: number): number | null {
    const milestones = [3, 7, 14, 30, 50, 100, 365]
    return milestones.includes(streak) ? streak : null
  }
}
