import { inject } from '@adonisjs/core'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { SchedulingQueueManager } from '../app/services/scheduling_manager.js'
@inject()
export default class Scheduling extends BaseCommand {
  constructor(
    protected scheduling_manager: SchedulingQueueManager,
    app: any,
    kernel: any,
    ui: any,
    prompt: any,
    application: any
  ) {
    super(app, kernel, ui, prompt, application)
  }

  static commandName = 'scheduling'
  static description = ''

  static options: CommandOptions = { startApp: true }

  async run() {
    await this.scheduling_manager.createAndStartSchedulersQueue()
  }
}