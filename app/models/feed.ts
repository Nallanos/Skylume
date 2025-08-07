import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Feed extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string

  @column()
  declare keywordsCursor: { [key: string]: string | null }

  @column()
  declare userId: string

  @column()
  declare accountHandle: string

  @column()
  declare isProcessing: boolean

  @column()
  declare lastProcessedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}