import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string("name").notNullable()
      table.string("keywords")
      table.string("strategy").notNullable()
      table.string("message", 10000).notNullable()
      table.string("account_handle").references("accounts.handle").notNullable().onDelete("CASCADE")
      table.string("user_id").references("users.id").notNullable().onDelete("CASCADE")
      table.boolean("status").defaultTo(false)
      table.string("followers_cursor").nullable()
      table.integer("number_of_message_sent").defaultTo(0)
      table.integer("number_of_message_received").defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}