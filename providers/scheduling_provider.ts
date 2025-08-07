import type { ApplicationService } from '@adonisjs/core/types'
import { SchedulingQueueManager } from '../app/bluesky/scheduling_manager.js'

export default class SchedulingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(SchedulingQueueManager, () => {
      return this.app.container.make(SchedulingQueueManager)
    })
  }

  async boot() {
    // Optionally, start the scheduling queue when the app boots
  }

  async ready() {
    // Start the scheduling queue manager when the application is ready
    const schedulingManager = await this.app.container.make(SchedulingQueueManager)
    await schedulingManager.createAndStartSchedulersQueue()
  }
}
