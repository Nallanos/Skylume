import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import scheduling_manager from '../app/bluesky/scheduling_manager.js'

export default class Scheduling extends BaseCommand {
  static commandName = 'scheduling'
  static description = ''

  static options: CommandOptions = { startApp: true }

  async run() {
    await scheduling_manager.createAndStartSchedulersQueue()
  }
}