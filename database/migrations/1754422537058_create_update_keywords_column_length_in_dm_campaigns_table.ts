import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('keywords').alter().comment('Keywords stored as JSON array')
      table.text('exclude_keywords').nullable().alter().comment('Exclude keywords stored as JSON array')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('keywords', 255).alter()
      table.string('exclude_keywords', 255).nullable().alter()
    })
  }
}