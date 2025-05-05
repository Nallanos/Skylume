import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import SuperCluster from './super_cluster.js'
import Follower from './follower.js'

export default class Cluster extends BaseModel {
  @column({ isPrimary: true })
  declare tag: string

  @column()
  declare embedding: string[]

  @column()
  declare size: number

  @hasMany(() => Follower)
  declare followers: HasMany<typeof Follower>

  @belongsTo(() => SuperCluster)
  declare SuperCluster: BelongsTo<typeof SuperCluster>
}