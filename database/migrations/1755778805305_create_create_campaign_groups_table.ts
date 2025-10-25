import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Reference to the DM campaign
      table.integer('campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      
      // Group configuration
      table.string('name', 100).notNullable().comment('User-defined group name')
      table.json('conditions').notNullable().comment('Conditions for belonging to this group')
      table.text('message').notNullable().comment('Message template for this group')
      table.integer('order').defaultTo(1).comment('Group priority order (1 = highest priority)')
      
      // Statistics
      table.integer('target_count').defaultTo(0).comment('Estimated number of recipients')
      table.integer('messages_sent').defaultTo(0).comment('Messages actually sent')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Performance indexes
      table.index(['campaign_id', 'order'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}