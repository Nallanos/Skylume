import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from './account.js'
export default class Follower extends BaseModel {
  @column({ isPrimary: true })
  declare handle: string

  @column()
  declare interest: string[]

  @column()
  declare account_handle: string


  @belongsTo(() => Account)
  declare user: BelongsTo<typeof Account>
}