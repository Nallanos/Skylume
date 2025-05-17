import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SuperCluster from './superCluster.js'
import Account from './account.js'

export default class Cluster extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tag: string

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
  declare superClusterId: number

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

  @column()
  declare accountHandle: string

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => SuperCluster)
  declare superCluster: BelongsTo<typeof SuperCluster>
}