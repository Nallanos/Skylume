import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueStatus extends BaseCommand {
  static commandName = 'queue:status'
  static description = 'Show BullMQ queue status and statistics'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🔍 Checking BullMQ queue status...')

    try {
      // TODO: Implémenter les stats via SchedulingQueueManager
      const stats = { waiting: 0, active: 0, completed: 0, failed: 0 }
      
      this.logger.info('📊 Queue Statistics:')
      this.logger.info(`  ⏳ Waiting: ${stats.waiting}`)
      this.logger.info(`  🔄 Active: ${stats.active}`)
      this.logger.info(`  ✅ Completed: ${stats.completed}`)
      this.logger.info(`  ❌ Failed: ${stats.failed}`)
      
      const totalJobs = stats.waiting + stats.active + stats.completed + stats.failed
      this.logger.info(`  📈 Total processed: ${totalJobs}`)

      if (stats.active > 0) {
        this.logger.success('🟢 Workers are processing jobs!')
      } else if (stats.waiting > 0) {
        this.logger.warning('🟡 Jobs are waiting to be processed')
      } else {
        this.logger.info('⚪ No active jobs in queue')
      }

    } catch (error) {
      this.logger.error('❌ Error getting queue stats:', error.message)
      this.exitCode = 1
    }
  }
}
