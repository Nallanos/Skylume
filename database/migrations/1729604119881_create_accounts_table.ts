import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('user_id').unsigned().references('users.id').onDelete('CASCADE')
      table.string("app_password")
      table.string('id').primary()
      table.string('did').nullable()
      table.string('handle').unique()
      table.string("session", 1600).nullable()
      table.string("seen_notification_at")
      table.string("job_id").nullable()
      table.string("followers_cursor").nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}