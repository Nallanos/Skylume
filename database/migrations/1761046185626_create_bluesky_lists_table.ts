import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bluesky_lists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE')
      
      table.string('name').notNullable()
      table.text('description').nullable()
      
      // Bluesky list URI (at://did:plc:xxx/app.bsky.graph.list/xxxxx)
      table.string('list_uri').nullable().unique()
      table.string('list_rkey').nullable()
      
      table.integer('member_count').defaultTo(0)
      
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}