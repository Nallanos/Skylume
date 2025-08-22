import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_variables'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Référence vers la campagne DM
      table.integer('campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      
      // Configuration de la variable
      table.string('name', 100).notNullable().comment('Nom de la variable utilisée dans les templates')
      table.string('type', 50).notNullable().comment('Type de variable: follower_count, profile_data, etc.')
      table.json('configuration').nullable().comment('Configuration spécifique au type de variable')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour les performances
      table.index(['campaign_id', 'name'])
      table.unique(['campaign_id', 'name'], 'unique_variable_per_campaign')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}