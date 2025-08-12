import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DmCampaign from './dm_campaign.js'

export default class CampaignMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare dmCampaignId: number

  @column()
  declare interestLevel: 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'

  @column()
  declare message: string

  @column()
  declare isActive: boolean

  @column()
  declare enabled: boolean

  @column()
  declare executionOrder: number

  @column()
  declare targetCount: number

  @column()
  declare messagesSentCount: number

  @column()
  declare priorityOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DmCampaign)
  declare dmCampaign: BelongsTo<typeof DmCampaign>
}