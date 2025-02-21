import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DmCampaignConvo extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare dm_campaign_id: string

  @column()
  declare convo_id: string

  @column()
  declare convoDid: string

  @column()
  declare last_message_sent_at: string
}
