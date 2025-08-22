import { BaseModel, column, manyToMany, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import Convo from './convo.js'
import User from './user.js'
import Account from './account.js'
import FollowerCampaign from './follower_campaign.js'
import CampaignMessage from './campaign_message.js'
import CampaignVariable from './campaign_variable.js'
import CampaignGroup from './campaign_group.js'
import CampaignGroupMessage from './campaign_group_message.js'
import type { ManyToMany, BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

type AnalysisStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export default class DmCampaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  // Ancien message supprimé - maintenant dans campaign_messages

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
  declare excludeKeywords: string | null

  @column()
  declare followersCursor: string | undefined

  // Champs pour le tracking des conversations
  @column()
  declare checkConversationsStatus: string

  @column.dateTime()
  declare lastConversationCheck: DateTime | null

  // Nouveaux champs pour l'analyse
  @column()
  declare analysisStatus: AnalysisStatus

  @column()
  declare totalFollowersAnalyzed: number

  @column()
  declare interestedFollowers: number

  @column()
  declare moderatelyInterestedFollowers: number

  @column()
  declare notInterestedFollowers: number

  @column()
  declare cannotDetermineFollowers: number

  @column()
  declare excludedFollowers: number

  @column()
  declare targetCount: number

  @column()
  declare keywordsEmbeddings: string | null

  @column()
  declare excludeKeywordsEmbeddings: string | null

  // ✅ NOUVEAU: Champ pour les facets rich text
  @column()
  declare messageFacets: string | null

  // Seuils personnalisables pour la classification
  @column()
  declare interestedThreshold: number

  @column()
  declare moderatelyInterestedThreshold: number

  @column.dateTime()
  declare analysisStartedAt: DateTime | null

  @column.dateTime()
  declare analysisCompletedAt: DateTime | null

  @column.dateTime()
  declare executionStartedAt: DateTime | null

  @column.dateTime()
  declare executionCompletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => Convo)
  declare convos: ManyToMany<typeof Convo>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => User, { foreignKey: 'account_id' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => FollowerCampaign, { foreignKey: 'dm_campaign_id' })
  declare followerCampaigns: HasMany<typeof FollowerCampaign>

  @hasMany(() => CampaignMessage, { foreignKey: 'dmCampaignId' })
  declare messages: HasMany<typeof CampaignMessage>

  @hasMany(() => CampaignVariable, { foreignKey: 'campaignId' })
  declare variables: HasMany<typeof CampaignVariable>

  @hasMany(() => CampaignGroup, { foreignKey: 'campaignId' })
  declare groups: HasMany<typeof CampaignGroup>

  @hasMany(() => CampaignGroupMessage, { foreignKey: 'campaignId' })
  declare groupMessages: HasMany<typeof CampaignGroupMessage>
}