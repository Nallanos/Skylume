import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Account from './account.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RelationshipHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'account_id' })
  declare accountId: string

  @column({ columnName: 'mutual_count' })
  declare mutualCount: number

  @column({ columnName: 'i_follow_only_count' })
  declare iFollowOnlyCount: number

  @column({ columnName: 'they_follow_only_count' })
  declare theyFollowOnlyCount: number

  @column({ columnName: 'total_count' })
  declare totalCount: number

  @column.date({ columnName: 'recorded_at' })
  declare recordedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>
}