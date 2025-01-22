import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'convos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().unique().notNullable()
      table.string("listener_id").references("listeners.id").onDelete('CASCADE').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}