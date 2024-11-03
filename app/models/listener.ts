import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, } from '@adonisjs/lucid/orm'

import Account from './account.js'

export default class Listener extends BaseModel {
  public static table = 'listeners'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare account_id: string

  @column()
  declare event: string

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
}
