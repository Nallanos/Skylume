import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feeds'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the existing user_id column if it exists without foreign key constraint
      table.dropColumn('user_id')
    })
    
    // Add the user_id column back with proper foreign key constraint
    this.schema.alterTable(this.tableName, (table) => {
      table.string('user_id').notNullable().references('users.id').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
    })
    
    // Restore the original user_id column without foreign key constraint
    this.schema.alterTable(this.tableName, (table) => {
      table.string('user_id').notNullable()
    })
  }
}