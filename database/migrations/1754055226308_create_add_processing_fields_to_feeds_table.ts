import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feeds'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_processing').defaultTo(false)
      table.timestamp('last_processed_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_processing')
      table.dropColumn('last_processed_at')
    })
  }
}