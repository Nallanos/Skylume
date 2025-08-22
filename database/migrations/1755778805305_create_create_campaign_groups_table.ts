import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Référence vers la campagne DM
      table.integer('campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      
      // Configuration du groupe
      table.string('name', 100).notNullable().comment('Nom du groupe défini par l\'utilisateur')
      table.json('conditions').notNullable().comment('Conditions pour appartenir à ce groupe')
      table.text('message').notNullable().comment('Template de message pour ce groupe')
      table.integer('order').defaultTo(1).comment('Ordre de priorité du groupe (1 = plus haute priorité)')
      
      // Statistiques
      table.integer('target_count').defaultTo(0).comment('Nombre estimé de destinataires')
      table.integer('messages_sent').defaultTo(0).comment('Messages effectivement envoyés')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour les performances
      table.index(['campaign_id', 'order'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}