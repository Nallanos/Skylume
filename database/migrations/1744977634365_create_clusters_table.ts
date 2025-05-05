import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clusters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id").primary()
      table.string('tag')
      table.string("embeddings")
      table.jsonb("handles")
      table.integer("size")
      table.string("account_id").references("accounts.id").onDelete('CASCADE')
      table.integer("super_clusters_id").references("super_clusters.id").onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
