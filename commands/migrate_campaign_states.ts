import { BaseCommand } from '@adonisjs/core/ace'
import DmCampaign from '#models/dm_campaign'

export default class MigrateCampaignStates extends BaseCommand {
  static commandName = 'migrate:campaign-states'
  static description = 'Migrate existing shouldStop/shouldPause flags to execution_state enum'

  async run() {
    this.logger.info('Starting campaign state migration...')

    const campaigns = await DmCampaign.all()
    let migratedCount = 0

    for (const campaign of campaigns) {
      let newState: string = 'stopped'

      // Convert existing boolean states to new enum based on priority:
      // 1. If shouldStop is true -> stopped
      // 2. If shouldPause is true -> paused  
      // 3. If executionStatus is 'running' -> running
      // 4. If executionStatus exists -> use it as is
      // 5. Otherwise -> stopped (default)

      if (campaign.shouldStop) {
        newState = 'stopped'
      } else if (campaign.shouldPause) {
        newState = 'paused'
      } else if (campaign.executionStatus) {
        // Map existing executionStatus values to new enum
        switch (campaign.executionStatus) {
          case 'running':
            newState = 'running'
            break
          case 'paused':
            newState = 'paused'
            break
          case 'stopping':
            newState = 'stopping'
            break
          case 'stopped':
            newState = 'stopped'
            break
          case 'completed':
            newState = 'completed'
            break
          case 'failed':
            newState = 'failed'
            break
          default:
            newState = 'stopped'
        }
      } else {
        // Default to stopped for campaigns without execution status
        newState = 'stopped'
      }

      // Update the campaign with new state
      campaign.executionState = newState
      await campaign.save()
      migratedCount++

      this.logger.info(`Migrated campaign ${campaign.id}: ${campaign.name} -> ${newState}`)
    }

    this.logger.success(`Successfully migrated ${migratedCount} campaigns to new state system`)
  }
}