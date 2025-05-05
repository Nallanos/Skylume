import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('followers_count').nullable()
      table.integer('posts_count').nullable()
      table.string('engagement_rate').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('followers_count')
      table.dropColumn('posts_count')
      table.dropColumn('engagement_rate')
    })
  }
}