import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, computed } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import Account from './account.js'
import TwitterAccount from './twitter_account.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Scheduling from './scheduling.js'
import FollowersHistory from './followers_history.js'
import HashtagGroup from './hashtag_group.js'
import ScheduleSlot from './schedule_slot.js'
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['id'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string | null

  @column()
  declare plan: string

  @column()
  declare dmsSent: number

  @column()
  declare isScheduledLimitReached: boolean

  @column()
  declare isDmsLimitReached: boolean

  @column()
  declare postScheduled: number

  @column()
  declare postsPerDay: number

  @column()
  declare currentStreak: number

  @column()
  declare longestStreak: number

  @column.date()
  declare lastPostDate: DateTime | null

  @column.date()
  declare streakStartDate: DateTime | null

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare subscriptionsId: string | undefined

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  // Configure Remember Me tokens provider
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @hasMany(() => Account)
  declare account: HasMany<typeof Account>

  @hasMany(() => TwitterAccount)
  declare twitterAccounts: HasMany<typeof TwitterAccount>

  @hasMany(() => Scheduling)
  declare scheduling: HasMany<typeof Scheduling>

  @hasMany(() => FollowersHistory)
  declare followersHistory: HasMany<typeof FollowersHistory>

  @hasMany(() => HashtagGroup)
  declare hashtagGroups: HasMany<typeof HashtagGroup>

  @hasMany(() => ScheduleSlot)
  declare scheduleSlots: HasMany<typeof ScheduleSlot>

  @column()
  declare token_app_password: string | null

  @column()
  declare marketing_consent: boolean

  // Nouvelles colonnes pour le suivi des limites
  @column()
  declare followerLoadingsThisMonth: number

  @column()
  declare dailyFollowActionsCount: number

  @column.date()
  declare lastFollowActionDate: DateTime | null

  @column()
  declare planLimitsReached: string | null

  @column.dateTime()
  declare planUpgradedAt: DateTime | null

  @column.dateTime()
  declare planDowngradedAt: DateTime | null

  @computed()
  get scheduledCount(): number {
    return this.$extras.scheduledCount || 0
  }

  @computed()
  get followersCount(): number {
    return this.$extras.followersCount || 0
  }

  @computed()
  get followersGrowth(): number {
    return this.$extras.followersGrowth || 0
  }

  @computed()
  get isStreakActive(): boolean {
    if (!this.lastPostDate) return false
    
    const today = DateTime.now().startOf('day')
    const yesterday = today.minus({ days: 1 })
    const lastPost = this.lastPostDate.startOf('day')
    
    // Streak is active if posted today or yesterday
    return lastPost.equals(today) || lastPost.equals(yesterday)
  }

  @computed()
  get streakStatus(): 'active' | 'at-risk' | 'broken' {
    if (!this.lastPostDate) return 'broken'
    
    const today = DateTime.now().startOf('day')
    const yesterday = today.minus({ days: 1 })
    const lastPost = this.lastPostDate.startOf('day')
    
    if (lastPost.equals(today)) return 'active'
    if (lastPost.equals(yesterday)) return 'at-risk'
    return 'broken'
  }
}