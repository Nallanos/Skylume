import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SuperCluster from './superCluster.js'
import Account from './account.js'

export default class Cluster extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tag: string

  @column()
  declare handles: string[]

  @column()
  declare superClusterId: number

  @column()
  declare embedding: number[]

  @column()
  declare size: number

  @column()
  declare accountId: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => SuperCluster)
  declare SuperCluster: BelongsTo<typeof SuperCluster>
}