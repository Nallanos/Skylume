import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Account from './account.js'
import BlueskyListMember from './bluesky_list_member.js'

export default class BlueskyList extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare accountId: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare listUri: string | null

  @column()
  declare listRkey: string | null

  @column()
  declare memberCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => BlueskyListMember, {
    foreignKey: 'listId',
  })
  declare members: HasMany<typeof BlueskyListMember>
}