import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Account from './account.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Scheduling from './scheduling.js'
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare plan: string

  @column()
  declare dmsSent: number

  @column()
  declare isScheduledLimitReached: boolean

  @column()
  declare isDmsLimitReached: boolean

  @column()
  declare postScheduled: number

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare subscriptionsId: string | undefined

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Account)
  declare account: HasMany<typeof Account>

  @hasMany(() => Scheduling)
  declare scheduling: HasMany<typeof Scheduling>

  @column()
  declare token_app_password: string | null

  @column()
  declare marketing_consent: boolean
}