import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follower_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('conversation_checked').defaultTo(false)
      table.timestamp('last_message_at').nullable()
      table.string('conversation_id', 255).nullable()
      table.boolean('already_contacted').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('conversation_checked')
      table.dropColumn('last_message_at')
      table.dropColumn('conversation_id')
      table.dropColumn('already_contacted')
    })
  }
}