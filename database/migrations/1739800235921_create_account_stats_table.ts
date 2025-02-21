import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'account_stats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer("number_of_message_sent").defaultTo(0)
      table.string("account_id").references("accounts.id")
      table.integer("number_of_message_received").defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}