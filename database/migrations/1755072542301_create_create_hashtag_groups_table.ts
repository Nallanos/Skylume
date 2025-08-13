import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hashtag_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index et contrainte unique
      table.unique(['user_id', 'name'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}