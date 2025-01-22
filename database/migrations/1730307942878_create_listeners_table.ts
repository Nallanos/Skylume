import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listeners'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id").unique().nullable().primary()
      table.string("account_id").references("accounts.id").onDelete('CASCADE')
      table.string("user_id").references("users.id").onDelete("CASCADE")
      table.string("event")
      table.string("handler")
      table.float("wait_time")
      table.string("action")
      table.string("message")
      table.integer("number_of_message_sent").defaultTo(0)
      table.integer("number_of_message_received").defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}