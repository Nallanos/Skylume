import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.string("app_password")
      table.string('id').primary()
      table.string('did').nullable()
      table.string('bksy_social')
      table.string("session").nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}