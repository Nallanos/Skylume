import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Listener from './listener.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import DmCampaign from './dm_campaign.js'

export default class Convo extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare did: string

  @manyToMany(() => Listener)
  declare listeners: ManyToMany<typeof Listener>

  @manyToMany(() => DmCampaign)
  declare DmCampaigns: ManyToMany<typeof DmCampaign>

  @column()
  declare last_message_sent_at: string
}