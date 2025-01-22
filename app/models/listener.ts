import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, hasMany, } from '@adonisjs/lucid/orm'

import Convo from './convo.js'
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
  declare user_id: string

  @column()
  declare handler: string

  @column()
  declare wait_time: number

  @column()
  declare message: string

  @column()
  declare action: string

  @column()
  declare numberOfMessageSent: number

  @column()
  declare numberOfMessageReceived: number

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Convo)
  declare convos: HasMany<typeof Convo>
}
