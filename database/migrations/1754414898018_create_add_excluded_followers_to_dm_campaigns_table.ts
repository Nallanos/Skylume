import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('excluded_followers').defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('excluded_followers')
    })
  }
}