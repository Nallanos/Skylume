import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, manyToMany, } from '@adonisjs/lucid/orm'

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
  declare number_of_message_sent: number

  @column()
  declare number_of_message_received: number

  @manyToMany(() => Convo)
  declare convos: ManyToMany<typeof Convo>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User, { foreignKey: 'account_id' })
  declare user: BelongsTo<typeof User>
}
