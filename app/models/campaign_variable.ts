import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import DmCampaign from './dm_campaign.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CampaignVariable extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'campaign_id' })
  declare campaignId: number

  @column()
  declare name: string

  @column()
  declare type: string

  @column({
    serialize: (value: string | null) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch (error) {
        console.error('Error parsing configuration:', error, 'Value:', value)
        return null
      }
    },
    prepare: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'object' ? JSON.stringify(value) : value
      } catch (error) {
        console.error('Error stringifying configuration:', error, 'Value:', value)
        return null
      }
    }
  })
  declare configuration: Record<string, any> | null

  @belongsTo(() => DmCampaign, { foreignKey: 'campaignId' })
  declare campaign: BelongsTo<typeof DmCampaign>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}