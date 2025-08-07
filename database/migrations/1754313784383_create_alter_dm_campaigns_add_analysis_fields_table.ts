import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Statut de l'analyse
      table.enum('analysis_status', ['pending', 'in_progress', 'completed', 'failed']).defaultTo('pending')
      
      // Compteurs de followers
      table.integer('total_followers_analyzed').defaultTo(0)
      table.integer('interested_followers').defaultTo(0)
      table.integer('moderately_interested_followers').defaultTo(0)
      table.integer('not_interested_followers').defaultTo(0)
      table.integer('cannot_determine_followers').defaultTo(0)
      
      // Configuration de la campagne
      table.integer('target_count').defaultTo(0) // Nombre de followers à cibler
      table.json('keywords_embeddings').nullable() // Stockage des embeddings des keywords
      
      // Dates importantes
      table.timestamp('analysis_started_at').nullable()
      table.timestamp('analysis_completed_at').nullable()
      table.timestamp('execution_started_at').nullable()
      table.timestamp('execution_completed_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('analysis_status')
      table.dropColumn('total_followers_analyzed')
      table.dropColumn('interested_followers')
      table.dropColumn('moderately_interested_followers')
      table.dropColumn('not_interested_followers')
      table.dropColumn('cannot_determine_followers')
      table.dropColumn('target_count')
      table.dropColumn('keywords_embeddings')
      table.dropColumn('analysis_started_at')
      table.dropColumn('analysis_completed_at')
      table.dropColumn('execution_started_at')
      table.dropColumn('execution_completed_at')
    })
  }
}