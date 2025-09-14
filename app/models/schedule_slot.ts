import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class ScheduleSlot extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare timeSlot: string

  @column()
  declare monday: boolean

  @column()
  declare tuesday: boolean

  @column()
  declare wednesday: boolean

  @column()
  declare thursday: boolean

  @column()
  declare friday: boolean

  @column()
  declare saturday: boolean

  @column()
  declare sunday: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}