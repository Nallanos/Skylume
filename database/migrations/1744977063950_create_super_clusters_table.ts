import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'super_clusters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id").primary()
      table.string('tag')
      table.jsonb("embeddings")
      table.jsonb("handles")
      table.integer("size")
      table.string("account_id").references("accounts.id").onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}