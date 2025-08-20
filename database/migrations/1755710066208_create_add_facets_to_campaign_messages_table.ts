import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('facets').nullable().comment('Rich text facets JSON for message content')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('facets')
    })
  }
}