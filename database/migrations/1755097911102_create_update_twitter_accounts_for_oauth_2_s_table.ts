import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'twitter_accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove OAuth 1.0a field
      table.dropColumn('access_token_secret')
      
      // Add OAuth 2.0 field
      table.string('refresh_token').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Restore OAuth 1.0a field
      table.string('access_token_secret').notNullable()
      
      // Remove OAuth 2.0 field
      table.dropColumn('refresh_token')
    })
  }
}