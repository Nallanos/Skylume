import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clusters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('tag')
      table.string("embeddings")
      table.integer("size")
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}