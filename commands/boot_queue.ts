import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import queue_manager from '../app/bluesky/queue_manager.js'
export default class BootQueue extends BaseCommand {
  static commandName = 'boot:queue'
  static description = ''

  static options: CommandOptions = { startApp: true }

  async run() {
    await queue_manager.createAndStartListenersQueue()


  }
}