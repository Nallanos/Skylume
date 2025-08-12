import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('target_count').defaultTo(0).comment('Number of followers to target for this category')
      table.integer('messages_sent_count').defaultTo(0).comment('Number of messages sent for this category')
      table.integer('priority_order').defaultTo(1).comment('Execution priority order (1 = highest priority)')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('target_count')
      table.dropColumn('messages_sent_count')
      table.dropColumn('priority_order')
    })
  }
}