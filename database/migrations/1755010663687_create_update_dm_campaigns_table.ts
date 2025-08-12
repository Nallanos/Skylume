import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Supprimer l'ancien champ message (maintenant dans campaign_messages)
      table.dropColumn('message')
      // Ajouter métadonnées pour le tracking
      table.string('check_conversations_status', 50).defaultTo('pending')
      table.timestamp('last_conversation_check').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remettre le champ message
      table.text('message').nullable()
      table.dropColumn('check_conversations_status')
      table.dropColumn('last_conversation_check')
    })
  }
}