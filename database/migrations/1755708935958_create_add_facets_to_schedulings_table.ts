import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('facets').nullable().comment('Rich text facets JSON for Bluesky posts')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('facets')
    })
  }
}