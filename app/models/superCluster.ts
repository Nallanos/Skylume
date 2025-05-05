import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Account from './account.js'
export default class SuperCluster extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tag: string

  @column()
  declare embedding: number[]

  @column()
  declare size: number

  @column()
  declare handles: string[]

  @column()
  declare accountId: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => SuperCluster)
  declare SuperCluster: HasMany<typeof SuperCluster>
}