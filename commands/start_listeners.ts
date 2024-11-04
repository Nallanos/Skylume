import { bootBlueskyListeners } from '#start/bluesky'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class StartListeners extends BaseCommand {
  static commandName = 'listeners:start'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await bootBlueskyListeners()
  }
}
