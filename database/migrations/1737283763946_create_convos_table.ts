import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'convos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().unique().notNullable()
      table.string('did').unique()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}