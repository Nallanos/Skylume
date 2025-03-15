import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('account_id').notNullable().references("accounts.id").onDelete("CASCADE")
      table.string('message').notNullable()
      table.string('schedule_time').notNullable()
      table.string('user_id').notNullable().references("users.id").onDelete("CASCADE")
      table.string("status").defaultTo("pending")
      table.string("job_id").nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}