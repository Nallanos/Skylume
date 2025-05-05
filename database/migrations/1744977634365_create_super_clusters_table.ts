import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'super_clusters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('tag')
      table.jsonb("embeddings")
      table.integer("size")
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}