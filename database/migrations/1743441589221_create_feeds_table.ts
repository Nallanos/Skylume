import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feeds'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string("account_id").references("accounts.id")
      table.json('keywords_cursor').notNullable()
      table.string('user_id').notNullable()
      table.string('account_handle').notNullable().references('accounts.handle')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}