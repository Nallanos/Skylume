import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'streak_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('date').notNullable()
      table.integer('posts_count').defaultTo(0).notNullable()
      table.integer('milestone_reached').nullable() // 7, 30, 100 days etc.
      table.text('special_comment').nullable() // Future: motivational messages
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Ensure one log entry per user per day
      table.unique(['user_id', 'date'])
      
      // Index for efficient queries
      table.index(['user_id', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}