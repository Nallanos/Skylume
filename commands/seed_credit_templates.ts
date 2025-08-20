  import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SeedCreditTemplates extends BaseCommand {
  static commandName = 'seed:credit-templates'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Hello world from "SeedCreditTemplates"')
  }
}