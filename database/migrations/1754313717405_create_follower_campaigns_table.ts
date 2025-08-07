import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follower_campaigns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Référence vers la campagne DM
      table.integer('dm_campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      
      // Informations du follower
      table.string('follower_did', 255).notNullable()
      table.string('follower_handle', 255).nullable()
      table.text('follower_bio').nullable()
      table.text('cleaned_bio').nullable()
      
      // Analyse sémantique
      table.decimal('similarity_score', 5, 4).nullable()
      table.enum('interest_level', ['interested', 'moderately_interested', 'not_interested', 'cannot_determine']).nullable()
      table.enum('bio_quality', ['good', 'poor', 'empty', 'spam']).defaultTo('empty')
      
      // Statut des messages
      table.boolean('message_sent').defaultTo(false)
      table.timestamp('message_sent_at').nullable()
      table.boolean('response_received').defaultTo(false)
      table.timestamp('response_received_at').nullable()
      
      // Métadonnées
      table.json('analysis_metadata').nullable() // Pour stocker des infos supplémentaires
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour améliorer les performances
      table.index(['dm_campaign_id', 'interest_level'])
      table.index(['follower_did'])
      table.index(['message_sent'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}