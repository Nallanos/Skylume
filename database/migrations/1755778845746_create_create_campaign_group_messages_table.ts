import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_group_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Relations
      table.integer('campaign_id').unsigned().references('id').inTable('dm_campaigns').onDelete('CASCADE')
      table.integer('group_id').unsigned().references('id').inTable('campaign_groups').onDelete('CASCADE')
      table.integer('follower_campaign_id').unsigned().references('id').inTable('follower_campaigns').onDelete('CASCADE')
      
      // Contenu du message personnalisé
      table.text('message_content').notNullable().comment('Message final avec variables résolues')
      table.json('variables_used').nullable().comment('Variables utilisées et leurs valeurs résolvées')
      table.text('facets').nullable().comment('Rich text facets JSON pour le contenu du message')
      
      // Métadonnées d'envoi
      table.timestamp('sent_at').nullable()
      table.boolean('delivery_success').defaultTo(false)
      table.text('delivery_error').nullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
      
      // Index pour les performances
      table.index(['campaign_id', 'group_id'])
      table.index(['follower_campaign_id'])
      table.index(['sent_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}