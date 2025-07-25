import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clusters'

  async up() {
    // Add robustness fields to clusters table
    this.schema.alterTable('clusters', (table) => {
      // Niveau de robustesse du clustering
      table.string('robustness_level').nullable() // 'strong', 'thematic', 'forced', 'cannot_determine'

      // Tag de robustesse pour l'affichage 
      table.string('robustness_tag').nullable() // '🟢 Strong (Natural)', etc.

      // Étape de la pipeline qui a généré ce cluster
      table.integer('pipeline_step').nullable() // 1-5

      // Méthode de clustering utilisée
      table.string('clustering_method').nullable() // 'HDBSCAN', 'LDA_HDBSCAN', 'KMeans_Forced'

      // Flag pour ignorer le tagging
      table.boolean('skip_tagging').defaultTo(false)

      // Statut de traitement
      table.string('processing_status').nullable() // 'processed', 'skipped'
    })

    // Add robustness fields to super_clusters table
    this.schema.alterTable('super_clusters', (table) => {
      // Même structure pour les superclusters
      table.string('robustness_level').nullable()
      table.string('robustness_tag').nullable()
      table.integer('pipeline_step').nullable()
      table.string('clustering_method').nullable()
      table.boolean('skip_tagging').defaultTo(false)
      table.string('processing_status').nullable()
    })
  }

  async down() {
    this.schema.alterTable('clusters', (table) => {
      table.dropColumn('robustness_level')
      table.dropColumn('robustness_tag')
      table.dropColumn('pipeline_step')
      table.dropColumn('clustering_method')
      table.dropColumn('skip_tagging')
      table.dropColumn('processing_status')
    })

    this.schema.alterTable('super_clusters', (table) => {
      table.dropColumn('robustness_level')
      table.dropColumn('robustness_tag')
      table.dropColumn('pipeline_step')
      table.dropColumn('clustering_method')
      table.dropColumn('skip_tagging')
      table.dropColumn('processing_status')
    })
  }
}