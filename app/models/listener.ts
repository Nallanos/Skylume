import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, } from '@adonisjs/lucid/orm'

import Account from './account.js'
import User from './user.js'

export default class Listener extends BaseModel {
  public static table = 'listeners'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare account_id: string

  @column()
  declare event: string

  @column()
  declare user_id: number

  @column()
  declare handler: string

  @column()
  declare wait_time: number

  @column()
  declare message: string

  @column()
  declare action: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
