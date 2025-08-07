import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('exclude_keywords').nullable()
      table.text('exclude_keywords_embeddings').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('exclude_keywords')
      table.dropColumn('exclude_keywords_embeddings')
    })
  }
}