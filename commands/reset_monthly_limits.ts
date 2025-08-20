import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { UsageTrackingService } from '#services/usage_tracking_service'

export default class ResetMonthlyLimits extends BaseCommand {
  static commandName = 'reset:monthly-limits'
  static description = 'Reset les compteurs mensuels de tous les utilisateurs'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🔄 Début du reset des compteurs mensuels...')
    
    try {
      await UsageTrackingService.resetMonthlyCounters()
      this.logger.success('✅ Compteurs mensuels resetés avec succès')
    } catch (error) {
      this.logger.error('❌ Erreur lors du reset des compteurs mensuels:', error.message)
      this.exitCode = 1
    }
  }
}