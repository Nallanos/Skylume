import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bluesky_list_blacklist'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // User who owns this blacklist entry
      table.string('user_id').notNullable()
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      
      // Bluesky account details
      table.string('did').notNullable()
      table.string('handle').notNullable()
      table.string('display_name').nullable()
      table.text('bio').nullable()
      table.string('avatar').nullable()
      
      // Reason for blacklisting (optional)
      table.text('reason').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Unique constraint: one user can only blacklist a DID once
      table.unique(['user_id', 'did'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}