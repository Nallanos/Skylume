import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listeners'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("id").unique().nullable()
      table.string("account_id").references("accounts.id").onDelete('CASCADE')
      table.integer("user_id").references("users.id").onDelete("CASCADE")
      table.string("event")
      table.string("handler")
      table.float("wait_time")
      table.string("action")
      table.string("message")
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}