import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Scheduling from '#models/scheduling'

export default class TwitterAccount extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare twitterUserId: string

  @column()
  declare username: string

  @column()
  declare displayName: string | null

  @column()
  declare accessToken: string

  @column()
  declare refreshToken: string | null

  @column()
  declare profileImageUrl: string | null

  @column()
  declare bio: string | null

  @column()
  declare followersCount: number

  @column()
  declare followingCount: number

  @column()
  declare postsCount: number

  @column()
  declare isRateLimited: boolean

  @column.dateTime()
  declare rateLimitReset: DateTime | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value)
  })
  declare settings: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Scheduling, {
    foreignKey: 'twitterAccountId'
  })
  declare schedulings: HasMany<typeof Scheduling>

  // Helper methods
  public get platform(): string {
    return 'twitter'
  }

  public get accountHandle(): string {
    return `@${this.username}`
  }

  public get displayInfo(): { name: string; handle: string; platform: string } {
    return {
      name: this.displayName || this.username,
      handle: this.accountHandle,
      platform: this.platform
    }
  }

  public isTokenExpired(): boolean {
    // Twitter tokens don't expire but check rate limiting
    return this.isRateLimited && this.rateLimitReset ? this.rateLimitReset > DateTime.now() : false
  }

  public async updateStats(stats: {
    followersCount?: number
    followingCount?: number
    postsCount?: number
  }) {
    if (stats.followersCount !== undefined) this.followersCount = stats.followersCount
    if (stats.followingCount !== undefined) this.followingCount = stats.followingCount
    if (stats.postsCount !== undefined) this.postsCount = stats.postsCount
    
    await this.save()
  }

  public async setRateLimit(resetTime?: DateTime) {
    this.isRateLimited = true
    this.rateLimitReset = resetTime || DateTime.now().plus({ hours: 1 })
    await this.save()
  }

  public async clearRateLimit() {
    this.isRateLimited = false
    this.rateLimitReset = null
    await this.save()
  }
}
