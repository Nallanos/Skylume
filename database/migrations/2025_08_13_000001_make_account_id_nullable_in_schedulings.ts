import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Make account_id nullable since we now support Twitter and Threads posts
      // that don't require a Bluesky account
      table.string('account_id').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert back to not nullable (this might fail if there are null values)
      table.string('account_id').notNullable().alter()
    })
  }
}
