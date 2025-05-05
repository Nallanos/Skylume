import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Follower from './follower.js'
export default class SuperCluster extends BaseModel {
  @column({ isPrimary: true })
  declare tag: string

  @column()
  declare embedding: string[]

  @column()
  declare size: number


  @hasMany(() => Follower)
  declare followers: HasMany<typeof Follower>

  @hasMany(() => SuperCluster)
  declare SuperCluster: HasMany<typeof SuperCluster>
}