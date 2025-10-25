import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('execution_status').nullable() // 'running', 'stopping', 'stopped', 'completed', 'failed'
      table.boolean('should_stop').defaultTo(false) // Flag to stop execution
      table.integer('execution_progress').defaultTo(0) // Nombre de messages envoyés pendant cette exécution
      table.integer('execution_target_count').defaultTo(0) // Objectif pour cette exécution
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('execution_status')
      table.dropColumn('should_stop')
      table.dropColumn('execution_progress')
      table.dropColumn('execution_target_count')
    })
  }
}