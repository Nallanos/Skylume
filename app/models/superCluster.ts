import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Account from './account.js'
import Cluster from './cluster.js'

export default class SuperCluster extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tag: string

  @column({
    prepare: (value: number[] | string) => typeof value === 'string' ? value : JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return [];
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (error) {
        console.error('Error parsing embeddings:', error);
        return [];
      }
    }
  })
  declare embeddings: number[]

  @column()
  declare size: number

  @column({
    prepare: (value: string[] | string) => typeof value === 'string' ? value : JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return [];
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (error) {
        console.error('Error parsing handles:', error);
        return [];
      }
    }
  })
  declare handles: string[]

  @column()
  declare accountHandle: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => Cluster)
  declare clusters: HasMany<typeof Cluster>
}