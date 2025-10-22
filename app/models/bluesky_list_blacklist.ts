import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class BlueskyListBlacklist extends BaseModel {
  static table = 'bluesky_list_blacklist'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare did: string

  @column()
  declare handle: string

  @column()
  declare displayName: string | null

  @column()
  declare bio: string | null

  @column()
  declare avatar: string | null

  @column()
  declare reason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
