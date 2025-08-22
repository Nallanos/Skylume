import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follower_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Référence vers le groupe auquel ce follower appartient
      table.integer('campaign_group_id').unsigned().nullable().references('id').inTable('campaign_groups').onDelete('SET NULL')
      
      // Stockage du nombre de followers pour les variables
      table.integer('followers_count').nullable().comment('Nombre de followers de cet utilisateur au moment de l\'analyse')
      
      // Index pour améliorer les performances
      table.index(['campaign_group_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['campaign_group_id'])
      table.dropColumn('campaign_group_id')
      table.dropColumn('followers_count')
    })
  }
}