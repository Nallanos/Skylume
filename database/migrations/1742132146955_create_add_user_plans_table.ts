import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string("plan").defaultTo("free")
      table.integer("dms_sent").defaultTo(0)
      table.boolean("is_dms_limit_reached").defaultTo(false)
      table.boolean("is_scheduled_limit_reached").defaultTo(false)
      table.string("subscriptions_id").nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}