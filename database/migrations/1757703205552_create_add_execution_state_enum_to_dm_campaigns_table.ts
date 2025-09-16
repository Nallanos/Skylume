import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add new execution_state enum column
      table.enum('execution_state', [
        'stopped', 
        'running', 
        'paused', 
        'stopping', 
        'completed', 
        'failed'
      ]).defaultTo('stopped').notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('execution_state')
    })
  }
}