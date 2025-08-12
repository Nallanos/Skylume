import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import DmCampaign from './dm_campaign.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

type InterestLevel = 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'
type BioQuality = 'good' | 'poor' | 'empty' | 'spam'

export default class FollowerCampaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'dm_campaign_id' })
  declare dmCampaignId: number

  @column({ columnName: 'follower_did' })
  declare followerDid: string

  @column({ columnName: 'follower_handle' })
  declare followerHandle: string | null

  @column({ columnName: 'follower_bio' })
  declare followerBio: string | null

  @column({ columnName: 'cleaned_bio' })
  declare cleanedBio: string | null

  @column({ columnName: 'similarity_score' })
  declare similarityScore: number | null

  @column({ columnName: 'interest_level' })
  declare interestLevel: InterestLevel | null

  @column({ columnName: 'bio_quality' })
  declare bioQuality: BioQuality

  @column({ columnName: 'message_sent' })
  declare messageSent: boolean

  @column.dateTime({ columnName: 'message_sent_at' })
  declare messageSentAt: DateTime | null

  @column({ columnName: 'response_received' })
  declare responseReceived: boolean

  @column.dateTime({ columnName: 'response_received_at' })
  declare responseReceivedAt: DateTime | null

  // Nouvelles colonnes pour le tracking des conversations
  @column({ columnName: 'conversation_checked' })
  declare conversationChecked: boolean

  @column.dateTime({ columnName: 'last_message_at' })
  declare lastMessageAt: DateTime | null

  @column({ columnName: 'conversation_id' })
  declare conversationId: string | null

  @column({ columnName: 'already_contacted' })
  declare alreadyContacted: boolean

  @column({
    serialize: (value: string | null) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch (error) {
        console.error('Error parsing analysisMetadata:', error, 'Value:', value)
        return null
      }
    },
    prepare: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'object' ? JSON.stringify(value) : value
      } catch (error) {
        console.error('Error stringifying analysisMetadata:', error, 'Value:', value)
        return null
      }
    }
  })
  declare analysisMetadata: Record<string, any> | null

  @belongsTo(() => DmCampaign, { foreignKey: 'dm_campaign_id' })
  declare dmCampaign: BelongsTo<typeof DmCampaign>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}