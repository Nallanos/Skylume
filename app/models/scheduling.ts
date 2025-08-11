import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Account from './account.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { DateTime } from 'luxon'

export default class Scheduling extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string

  @column()
  declare message: string

  @column.dateTime()
  declare scheduleTime: DateTime

  @column()
  declare userId: string

  @column()
  declare status: string

  @column()
  declare jobId: string

  @column({ serialize: (value: string) => value ? JSON.parse(value) : [] })
  declare images: string

  @column({ 
    columnName: 'alt_texts',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare altTexts: string

  @column({ 
    columnName: 'content_warnings',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare contentWarnings: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account, { foreignKey: 'account_id' })
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}