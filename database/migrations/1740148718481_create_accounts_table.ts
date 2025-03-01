import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean("is_rate_limited").defaultTo(false)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}