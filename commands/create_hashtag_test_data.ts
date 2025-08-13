import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CreateHashtagTestData extends BaseCommand {
  static commandName = 'create:hashtag-test-data'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Hello world from "CreateHashtagTestData"')
  }
}