import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import CampaignGroup from './campaign_group.js'

export default class GroupMessageTemplate extends BaseModel {
  static table = 'group_message_templates'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'campaign_group_id' })
  declare campaignGroupId: number

  @column()
  declare content: string

  @column()
  declare weight: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CampaignGroup, {
    foreignKey: 'campaignGroupId',
  })
  declare group: BelongsTo<typeof CampaignGroup>
}
