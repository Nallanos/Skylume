import { BaseModel, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Feed from './feed.js'
import type { AtpSessionData } from '@atproto/api'
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

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare numbersOfFollowersAnalyzed: number

  @column()
  declare numbersOfFollowersToAnalyze: number
}