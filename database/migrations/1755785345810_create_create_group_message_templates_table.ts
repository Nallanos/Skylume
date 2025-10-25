import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'group_message_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Reference to the group
      table.integer('campaign_group_id').unsigned().references('id').inTable('campaign_groups').onDelete('CASCADE')
      
      // Template content
      table.text('content').notNullable().comment('Message template with variables')
      table.integer('weight').defaultTo(1).comment('Weight for random selection')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Performance indexes
      table.index(['campaign_group_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}