import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_group_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Relations
      table.integer('campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      table.integer('group_id').unsigned().references('id').inTable('campaign_groups').onDelete('CASCADE')
      table.integer('follower_campaign_id').unsigned().references('id').inTable('follower_campaigns').onDelete('CASCADE')
      
      // Personalized message content
      table.text('message_content').notNullable().comment('Final message with resolved variables')
      table.json('variables_used').nullable().comment('Variables used and their resolved values')
      table.text('facets').nullable().comment('Rich text facets JSON for message content')
      
      // Sending metadata
      table.timestamp('sent_at').nullable()
      table.boolean('delivery_success').defaultTo(false)
      table.text('delivery_error').nullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Performance indexes
      table.index(['campaign_id', 'group_id'])
      table.index(['follower_campaign_id'])
      table.index(['sent_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}