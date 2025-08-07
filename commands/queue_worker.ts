import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class QueueWorker extends BaseCommand {
  static commandName = 'queue:work'
  static description = 'Start BullMQ worker to process scheduled posts'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🚀 Starting BullMQ worker for scheduling...')

    try {
      // Import dynamique pour éviter les problèmes de circular import
      const { default: SchedulingService } = await import('#services/scheduling_service')
      
      this.logger.success('✅ BullMQ worker started successfully!')
      this.logger.info('📡 Worker is listening for scheduled posts...')
      this.logger.info('📊 Use "node ace queue:status" to check queue statistics')
      this.logger.info('⚠️  Press Ctrl+C to stop the worker')

      // Garder le processus vivant
      process.on('SIGINT', async () => {
        this.logger.info('\n🛑 Stopping worker...')
        await SchedulingService.cleanup()
        this.logger.success('✅ Worker stopped gracefully')
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        this.logger.info('\n🛑 Stopping worker...')
        await SchedulingService.cleanup()
        this.logger.success('✅ Worker stopped gracefully')
        process.exit(0)
      })

      // Garder le processus en vie
      await new Promise(() => {})

    } catch (error) {
      this.logger.error('❌ Error starting worker:', error.message)
      this.exitCode = 1
    }
  }
}
