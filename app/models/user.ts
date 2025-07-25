import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, computed } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import Account from './account.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Scheduling from './scheduling.js'
import FollowersHistory from './followers_history.js'
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

  // Configure Remember Me tokens provider
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @hasMany(() => Account)
  declare account: HasMany<typeof Account>

  @hasMany(() => Scheduling)
  declare scheduling: HasMany<typeof Scheduling>

  @hasMany(() => FollowersHistory)
  declare followersHistory: HasMany<typeof FollowersHistory>

  @column()
  declare token_app_password: string | null

  @column()
  declare marketing_consent: boolean

  @computed()
  get scheduledCount(): number {
    return this.$extras.scheduledCount || 0
  }

  @computed()
  get followersCount(): number {
    return this.$extras.followersCount || 0
  }

  @computed()
  get followersGrowth(): number {
    return this.$extras.followersGrowth || 0
  }
}