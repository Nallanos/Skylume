import { BaseModel, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Listener from './listener.js'
import type { AtpSessionData } from "@atcute/client"

export default class Account extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare jobId: string

  @column()
  declare did: string

  @column()
  declare userId: string

  @column()
  declare appPassword: string

  @column()
  declare followersCursor: string | undefined

  @column()
  declare session: string | null

  @column()
  declare numberOfMessageSent: string | null

  @column()
  declare number_of_message_sent: number

  @column()
  declare number_of_message_received: number

  @computed()
  get at_session(): AtpSessionData | undefined {
    if (this.session) {
      return JSON.parse(this.session)
    }
  }

  @column()
  declare seenNotificationAt: string

  @column()
  declare handle: string

  @hasMany(() => Listener, { foreignKey: 'account_id' })
  declare listeners: HasMany<typeof Listener>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}