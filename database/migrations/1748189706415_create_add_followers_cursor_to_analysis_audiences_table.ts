import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'analysis_audiences'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('followers_cursor').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('followers_cursor')
    })
  }
}