import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers_histories'

  async up() {
    // Suppression de la contrainte existante puis recréation avec CASCADE
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('user_id')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
    })
  }

  async down() {
    // Retour à l'état initial sans CASCADE
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('user_id')
      table.foreign('user_id').references('id').inTable('users')
    })
  }
}