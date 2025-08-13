import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('current_streak').defaultTo(0).notNullable()
      table.integer('longest_streak').defaultTo(0).notNullable()
      table.date('last_post_date').nullable()
      table.date('streak_start_date').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('current_streak')
      table.dropColumn('longest_streak')
      table.dropColumn('last_post_date')
      table.dropColumn('streak_start_date')
    })
  }
}