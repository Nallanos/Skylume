import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedule_slots'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.string('time_slot', 20).notNullable() // e.g., "12:00 PM"
      table.boolean('monday').defaultTo(false)
      table.boolean('tuesday').defaultTo(false)
      table.boolean('wednesday').defaultTo(false)
      table.boolean('thursday').defaultTo(false)
      table.boolean('friday').defaultTo(false)
      table.boolean('saturday').defaultTo(false)
      table.boolean('sunday').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Ensure each user can have unique time slots
      table.unique(['user_id', 'time_slot'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}