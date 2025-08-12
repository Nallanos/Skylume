import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('enabled').defaultTo(true)
      table.integer('execution_order').defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('enabled')
      table.dropColumn('execution_order')
    })
  }
}