import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Listener from './listener.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Convo extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare listener_id: string

  @belongsTo(() => Listener)
  declare listener: BelongsTo<typeof Listener>
}