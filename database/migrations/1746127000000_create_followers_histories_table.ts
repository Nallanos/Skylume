import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers_histories'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('account_id').references('accounts.id').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}