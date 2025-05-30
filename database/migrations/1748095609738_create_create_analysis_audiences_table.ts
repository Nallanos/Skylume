import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'analysis_audiences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('account_id').notNullable()
      table.enum('status', ['pending', 'in_progress', 'completed', 'failed', 'stopped']).notNullable().defaultTo('pending')
      table.string('queue_job_id').nullable() // ID du job dans Redis
      table.json('progress').nullable() // { analyzed: number, total: number, percentage: number }
      table.json('result').nullable() // Résultats de l'analyse
      table.text('error_message').nullable()
      table.timestamp('started_at').nullable()
      table.timestamp('completed_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.foreign('account_id').references('accounts.id').onDelete('CASCADE')
      table.index(['account_id', 'status'])
      table.index(['queue_job_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}