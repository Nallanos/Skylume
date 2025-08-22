/*
|--------------------------------------------------------------------------
| Migration Script for Campaign Personalization
|--------------------------------------------------------------------------
|
| This command migrates existing campaigns to use the new personalization
| system with variables and groups instead of single messages.
|
*/

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class MigrateCampaignPersonalization extends BaseCommand {
  static commandName = 'migrate:campaign-personalization'
  static description = 'Migrate existing campaigns to use the new personalization system'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('Starting campaign personalization migration...')

    try {
      // Get all campaigns that don't have personalization data yet
      const campaigns = await db
        .from('campaigns')
        .whereNotExists((query) => {
          query
            .from('campaign_variables')
            .whereRaw('campaign_variables.campaign_id = campaigns.id')
        })
        .select('*')

      if (campaigns.length === 0) {
        this.logger.success('No campaigns need migration. All campaigns are already using the new system.')
        return
      }

      this.logger.info(`Found ${campaigns.length} campaigns to migrate`)

      let successCount = 0
      let errorCount = 0

      for (const campaign of campaigns) {
        try {
          await this.migrateCampaign(campaign)
          successCount++
          this.logger.info(`✅ Migrated campaign: ${campaign.name}`)
        } catch (error) {
          errorCount++
          this.logger.error(`❌ Failed to migrate campaign ${campaign.name}:`, error.message)
        }
      }

      this.logger.success(`Migration completed! ✅ ${successCount} successful, ❌ ${errorCount} failed`)

      // Validate migration integrity
      await this.validateMigration()

    } catch (error) {
      this.logger.error('Migration failed:', error.message)
      process.exit(1)
    }
  }

  private async migrateCampaign(campaign: any) {
    const trx = await db.transaction()

    try {
      // Step 1: Create default follower_count variable
      await trx
        .table('campaign_variables')
        .insert({
          campaign_id: campaign.id,
          name: 'follower_count',
          type: 'follower_count',
          configuration: JSON.stringify({ rounding: 'hundreds' }),
          created_at: DateTime.now().toSQL(),
          updated_at: DateTime.now().toSQL(),
        })

      // Step 2: Analyze existing follower_campaigns to create appropriate groups
      const followerStats = await trx
        .from('follower_campaigns')
        .where('campaign_id', campaign.id)
        .whereNotNull('similarity_score')
        .select(
          trx.raw('COUNT(*) as total'),
          trx.raw('COUNT(CASE WHEN similarity_score >= ? THEN 1 END) as highly_interested', [campaign.interested_threshold || 0.7]),
          trx.raw('COUNT(CASE WHEN similarity_score >= ? AND similarity_score < ? THEN 1 END) as moderately_interested', [
            campaign.moderately_interested_threshold || 0.5,
            campaign.interested_threshold || 0.7
          ]),
          trx.raw('COUNT(CASE WHEN similarity_score < ? THEN 1 END) as not_interested', [campaign.moderately_interested_threshold || 0.5])
        )
        .first()

      // Step 3: Create groups based on interest levels
      const groups = []

      // High Interest Group (if there are highly interested followers)
      if (followerStats.highly_interested > 0) {
        const highInterestGroup = await trx
          .table('campaign_groups')
          .insert({
            campaign_id: campaign.id,
            name: 'High Interest Followers',
            conditions: JSON.stringify({
              field: 'followers_count',
              operator: 'gte',
              value: '1000'
            }),
            priority: 1,
            estimated_targets: followerStats.highly_interested,
            created_at: DateTime.now().toSQL(),
            updated_at: DateTime.now().toSQL(),
          })
          .returning('id')

        groups.push({
          id: highInterestGroup[0].id || highInterestGroup[0],
          name: 'High Interest Followers',
          type: 'high_interest'
        })
      }

      // Moderate Interest Group (if there are moderately interested followers)
      if (followerStats.moderately_interested > 0) {
        const moderateInterestGroup = await trx
          .table('campaign_groups')
          .insert({
            campaign_id: campaign.id,
            name: 'Moderate Interest Followers',
            conditions: JSON.stringify({
              field: 'followers_count',
              operator: 'gte',
              value: '100'
            }),
            priority: 2,
            estimated_targets: followerStats.moderately_interested,
            created_at: DateTime.now().toSQL(),
            updated_at: DateTime.now().toSQL(),
          })
          .returning('id')

        groups.push({
          id: moderateInterestGroup[0].id || moderateInterestGroup[0],
          name: 'Moderate Interest Followers',
          type: 'moderate_interest'
        })
      }

      // General Group (for everyone else)
      const generalGroup = await trx
        .table('campaign_groups')
        .insert({
          campaign_id: campaign.id,
          name: 'General Followers',
          conditions: JSON.stringify({
            field: 'followers_count',
            operator: 'gte',
            value: '0'
          }),
          priority: groups.length + 1,
          estimated_targets: followerStats.total,
          created_at: DateTime.now().toSQL(),
          updated_at: DateTime.now().toSQL(),
        })
        .returning('id')

      groups.push({
        id: generalGroup[0].id || generalGroup[0],
        name: 'General Followers',
        type: 'general'
      })

      // Step 4: Create messages for each group
      // Use existing campaign message if it exists, otherwise create default messages
      const existingMessage = campaign.message || 'Hello {{follower_count}}+ followers! 👋'

      for (const group of groups) {
        let messageContent = existingMessage

        // Customize message based on group type
        if (group.type === 'high_interest') {
          messageContent = messageContent.includes('{{follower_count}}')
            ? messageContent
            : `Hi there! I noticed you have {{follower_count}} followers. ${messageContent}`
        } else if (group.type === 'moderate_interest') {
          messageContent = messageContent.includes('{{follower_count}}')
            ? messageContent
            : `Hello! With {{follower_count}} followers, you might be interested in: ${messageContent}`
        } else {
          messageContent = messageContent.includes('{{follower_count}}')
            ? messageContent
            : `Hi! I see you have {{follower_count}} followers. ${messageContent}`
        }

        await trx
          .table('campaign_group_messages')
          .insert({
            campaign_group_id: group.id,
            content: messageContent,
            weight: 1,
            created_at: DateTime.now().toSQL(),
            updated_at: DateTime.now().toSQL(),
          })
      }

      // Step 5: Update follower_campaigns to link them to appropriate groups
      // This is complex and would depend on your business logic
      // For now, we'll link all followers to the general group
      if (groups.length > 0) {
        const generalGroupId = groups.find(g => g.type === 'general')?.id || groups[groups.length - 1].id

        await trx
          .from('follower_campaigns')
          .where('campaign_id', campaign.id)
          .update({
            campaign_group_id: generalGroupId,
            updated_at: DateTime.now().toSQL(),
          })
      }

      await trx.commit()

    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async validateMigration() {
    this.logger.info('Validating migration integrity...')

    // Check that all campaigns have at least one variable
    const campaignsWithoutVariables = await db
      .from('campaigns')
      .whereNotExists((query) => {
        query
          .from('campaign_variables')
          .whereRaw('campaign_variables.campaign_id = campaigns.id')
      })
      .count('* as count')
      .first()

    if (campaignsWithoutVariables.count > 0) {
      this.logger.warning(`⚠️  ${campaignsWithoutVariables.count} campaigns still don't have variables`)
    }

    // Check that all campaigns have at least one group
    const campaignsWithoutGroups = await db
      .from('campaigns')
      .whereNotExists((query) => {
        query
          .from('campaign_groups')
          .whereRaw('campaign_groups.campaign_id = campaigns.id')
      })
      .count('* as count')
      .first()

    if (campaignsWithoutGroups.count > 0) {
      this.logger.warning(`⚠️  ${campaignsWithoutGroups.count} campaigns still don't have groups`)
    }

    // Check that all groups have at least one message
    const groupsWithoutMessages = await db
      .from('campaign_groups')
      .whereNotExists((query) => {
        query
          .from('campaign_group_messages')
          .whereRaw('campaign_group_messages.campaign_group_id = campaign_groups.id')
      })
      .count('* as count')
      .first()

    if (groupsWithoutMessages.count > 0) {
      this.logger.warning(`⚠️  ${groupsWithoutMessages.count} groups don't have messages`)
    }

    this.logger.success('Migration validation completed')
  }
}
