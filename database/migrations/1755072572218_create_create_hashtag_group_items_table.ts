import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hashtag_group_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('hashtag_group_id').unsigned().references('id').inTable('hashtag_groups').onDelete('CASCADE')
      table.string('hashtag', 100).notNullable()
      table.integer('position').defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour les requêtes
      table.index(['hashtag_group_id'])
      table.index(['hashtag_group_id', 'position'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}