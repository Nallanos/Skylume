import { BaseModel, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Feed from './feed.js'
import RelationshipHistory from './relationship_history.js'
import type { AtpSessionData } from '@atproto/api'
import { DateTime } from 'luxon'
export default class Account extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare jobId: string

  @column()
  declare did: string

  @column()
  declare userId: string

  @column()
  declare isRateLimited: boolean

  @column()
  declare appPassword: string

  @column()
  declare followersCursor: string | undefined

  @column()
  declare session: string | null

  @column()
  declare numberOfMessageSent: string | null

  @column()
  declare number_of_message_sent: number

  @column()
  declare number_of_message_received: number

  @column()
  declare followers_count: number

  @column()
  declare posts_count: number

  @column()
  declare engagement_rate: string

  // Platform identification
  @column()
  declare platform: string

  // Twitter-specific credentials
  @column()
  declare twitterAccessToken: string | null

  @column()
  declare twitterAccessTokenSecret: string | null

  @column()
  declare twitterUserId: string | null

  @column()
  declare twitterUsername: string | null

  // Threads-specific credentials
  @column()
  declare threadsAccessToken: string | null

  @column()
  declare threadsUserId: string | null

  @column()
  declare threadsUsername: string | null

  // Platform-specific settings
  @column({
    serialize: (value: string) => value ? JSON.parse(value) : {}
  })
  declare platformSettings: string

  // Rate limiting per platform
  @column()
  declare twitterRateLimited: boolean

  @column()
  declare threadsRateLimited: boolean

  @column.dateTime()
  declare twitterRateLimitReset: DateTime | null

  @column.dateTime()
  declare threadsRateLimitReset: DateTime | null

  @computed()
  get at_session(): AtpSessionData | undefined {
    if (this.session) {
      return JSON.parse(this.session)
    }
  }

  @computed()
  get followersCount(): number {
    return this.followers_count || 0
  }

  @computed()
  get postsCount(): number {
    return this.posts_count || 0
  }

  @computed()
  get engagementRate(): string {
    return this.engagement_rate || '0%'
  }

  @column()
  declare seenNotificationAt: string

  @column()
  declare handle: string

  @hasMany(() => Feed, { foreignKey: 'account_id' })
  declare feed: HasMany<typeof Feed>

  @hasMany(() => RelationshipHistory, { foreignKey: 'account_id' })
  declare relationshipHistories: HasMany<typeof RelationshipHistory>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare numbersOfFollowersAnalyzed: number

  @column()
  declare numbersOfFollowersToAnalyze: number
}