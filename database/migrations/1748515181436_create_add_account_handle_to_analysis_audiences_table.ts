import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'analysis_audiences'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('account_handle').nullable().after('account_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('account_handle')
    })
  }
}