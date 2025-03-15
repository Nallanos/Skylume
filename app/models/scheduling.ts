import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Account from './account.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Scheduling extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string

  @column()
  declare message: string

  @column()
  declare scheduleTime: string

  @column()
  declare userId: string

  @column()
  declare status: string

  @column()
  declare jobId: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}