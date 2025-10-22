import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bluesky_list_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      table.integer('list_id').unsigned().notNullable().references('id').inTable('bluesky_lists').onDelete('CASCADE')
      
      // Bluesky profile info
      table.string('did').notNullable()
      table.string('handle').notNullable()
      table.string('display_name').nullable()
      table.text('bio').nullable()
      table.string('avatar').nullable()
      table.integer('followers_count').defaultTo(0)
      
      // Matching score from search
      table.float('score').nullable()
      
      // Follow status
      table.boolean('is_followed').defaultTo(false)
      table.timestamp('followed_at').nullable()
      
      // Bluesky listitem URI (at://did:plc:xxx/app.bsky.graph.listitem/xxxxx)
      table.string('listitem_uri').nullable()
      table.string('listitem_rkey').nullable()
      
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      
      // Unique constraint: one profile per list
      table.unique(['list_id', 'did'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}