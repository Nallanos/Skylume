import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_groups'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('explicit_links').nullable().comment('Rich text explicit links JSON for group message content')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('explicit_links')
    })
  }
}
