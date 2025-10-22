import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import BlueskyList from './bluesky_list.js'

export default class BlueskyListMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare listId: number

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
  declare followersCount: number

  @column()
  declare score: number | null

  @column()
  declare isFollowed: boolean

  @column.dateTime()
  declare followedAt: DateTime | null

  @column()
  declare listitemUri: string | null

  @column()
  declare listitemRkey: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => BlueskyList, {
    foreignKey: 'listId',
  })
  declare list: BelongsTo<typeof BlueskyList>
}