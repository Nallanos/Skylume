import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import DmCampaign from './dm_campaign.js'
import FollowerCampaign from './follower_campaign.js'
import CampaignGroupMessage from './campaign_group_message.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CampaignGroup extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'campaign_id' })
  declare campaignId: number

  @column()
  declare name: string

  @column({
    serialize: (value: string | null) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch (error) {
        console.error('Error parsing conditions:', error, 'Value:', value)
        return null
      }
    },
    prepare: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'object' ? JSON.stringify(value) : value
      } catch (error) {
        console.error('Error stringifying conditions:', error, 'Value:', value)
        return null
      }
    }
  })
  declare conditions: Record<string, any>

  @column()
  declare message: string

  @column({ 
    columnName: 'explicit_links',
    serialize: (value: string | null) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch (error) {
        console.error('Error parsing explicit_links:', error, 'Value:', value)
        return null
      }
    },
    prepare: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'object' ? JSON.stringify(value) : value
      } catch (error) {
        console.error('Error stringifying explicit_links:', error, 'Value:', value)
        return null
      }
    }
  })
  declare explicitLinks: Array<{text: string, url: string}> | null

  @column()
  declare order: number

  @column({ columnName: 'target_count' })
  declare targetCount: number

  @column({ columnName: 'messages_sent' })
  declare messagesSent: number

  @belongsTo(() => DmCampaign, { foreignKey: 'campaignId' })
  declare campaign: BelongsTo<typeof DmCampaign>

  @hasMany(() => FollowerCampaign, { foreignKey: 'campaignGroupId' })
  declare followerCampaigns: HasMany<typeof FollowerCampaign>

  @hasMany(() => CampaignGroupMessage, { foreignKey: 'groupId' })
  declare groupMessages: HasMany<typeof CampaignGroupMessage>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}