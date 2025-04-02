import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}