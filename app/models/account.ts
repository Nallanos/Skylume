import { BaseModel, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Listener from './listener.js'
import type { AtpSessionData } from "@atcute/client"

export default class Account extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare did: string

  @column()
  declare userId: number

  @column()
  declare app_password: string

  @column()
  declare session: string | null

  @computed()
  get at_session(): AtpSessionData | undefined {
    if (this.session) {
      return JSON.parse(this.session)
    }
  }

  @column()
  declare bksy_social: string

  @hasMany(() => Listener)
  declare listeners: HasMany<typeof Listener>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}