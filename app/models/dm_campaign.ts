import { BaseModel, column, computed, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import Convo from './convo.js'
import User from './user.js'
import Account from './account.js'
import type { ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
export default class DmCampaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare message: string

  @column()
  declare accountHandle: string

  @column()
  declare strategy: string

  @column()
  declare user_id: string

  @column()
  declare number_of_message_received: number

  @column()
  declare number_of_message_sent: number

  @column()
  declare status: boolean

  @column()
  declare keywords: string

  @column()
  declare followersCursor: string | undefined

  @computed()
  get parsed_keywords(): string {
    return JSON.parse(this.keywords)
  }

  @manyToMany(() => Convo)
  declare convos: ManyToMany<typeof Convo>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User, { foreignKey: 'account_id' })
  declare user: BelongsTo<typeof User>
}