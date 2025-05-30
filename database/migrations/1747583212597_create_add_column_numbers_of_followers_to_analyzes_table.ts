import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('number_of_followers').defaultTo(0)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}