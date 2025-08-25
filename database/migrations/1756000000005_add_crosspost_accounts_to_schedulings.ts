import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('twitter_account_id').nullable()
      
      // Foreign keys
      table.foreign('twitter_account_id').references('id').inTable('twitter_accounts').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['twitter_account_id'])
      table.dropForeign(['threads_account_id'])
      table.dropColumn('twitter_account_id')
      table.dropColumn('threads_account_id')
    })
  }
}
