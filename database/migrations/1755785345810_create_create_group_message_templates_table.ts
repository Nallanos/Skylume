import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'group_message_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Référence vers le groupe
      table.integer('campaign_group_id').unsigned().references('id').inTable('campaign_groups').onDelete('CASCADE')
      
      // Contenu du template
      table.text('content').notNullable().comment('Template de message avec variables')
      table.integer('weight').defaultTo(1).comment('Poids pour la sélection aléatoire')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour les performances
      table.index(['campaign_group_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}