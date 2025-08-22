import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import DmCampaign from './dm_campaign.js'
import CampaignGroup from './campaign_group.js'
import FollowerCampaign from './follower_campaign.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignGroupMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'campaign_id' })
  declare campaignId: number

  @column({ columnName: 'group_id' })
  declare groupId: number

  @column({ columnName: 'follower_campaign_id' })
  declare followerCampaignId: number

  @column({ columnName: 'message_content' })
  declare messageContent: string

  @column({
    serialize: (value: string | null) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch (error) {
        console.error('Error parsing variables_used:', error, 'Value:', value)
        return null
      }
    },
    prepare: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'object' ? JSON.stringify(value) : value
      } catch (error) {
        console.error('Error stringifying variables_used:', error, 'Value:', value)
        return null
      }
    }
  })
  declare variablesUsed: Record<string, any> | null

  @column()
  declare facets: string | null

  @column.dateTime({ columnName: 'sent_at' })
  declare sentAt: DateTime | null

  @column({ columnName: 'delivery_success' })
  declare deliverySuccess: boolean

  @column({ columnName: 'delivery_error' })
  declare deliveryError: string | null

  @belongsTo(() => DmCampaign, { foreignKey: 'campaignId' })
  declare campaign: BelongsTo<typeof DmCampaign>

  @belongsTo(() => CampaignGroup, { foreignKey: 'groupId' })
  declare group: BelongsTo<typeof CampaignGroup>

  @belongsTo(() => FollowerCampaign, { foreignKey: 'followerCampaignId' })
  declare followerCampaign: BelongsTo<typeof FollowerCampaign>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}