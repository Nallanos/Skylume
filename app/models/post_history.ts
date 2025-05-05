import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from './account.js'
import User from './user.js'

export default class PostHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare accountId: string

  @column()
  declare userId: string

  @column()
  declare postUri: string

  @column()
  declare postCid: string

  @column()
  declare text: string

  @column()
  declare likes: number

  @column()
  declare reposts: number

  @column()
  declare replies: number

  @column()
  declare views: number

  @column.dateTime()
  declare postedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}