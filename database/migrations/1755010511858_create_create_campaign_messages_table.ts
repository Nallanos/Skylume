import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('dm_campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      table.string('interest_level', 50).notNullable()
      table.text('message').notNullable()
      table.string('subject', 255).nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}