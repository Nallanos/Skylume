import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import HashtagGroup from './hashtag_group.js'

export default class HashtagGroupItem extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare hashtagGroupId: number

  @column()
  declare hashtag: string

  @column()
  declare position: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => HashtagGroup)
  declare group: BelongsTo<typeof HashtagGroup>
}