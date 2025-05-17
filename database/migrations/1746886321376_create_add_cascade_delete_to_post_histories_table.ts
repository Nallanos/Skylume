import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_histories'

  async up() {
    // Suppression des contraintes existantes puis recréation avec CASCADE
    this.schema.alterTable(this.tableName, (table) => {
      // Pour user_id
      table.dropForeign('user_id')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

      // Pour account_id
      table.dropForeign('account_id')
      table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE')
    })
  }

  async down() {
    // Retour à l'état initial sans CASCADE
    this.schema.alterTable(this.tableName, (table) => {
      // Pour user_id
      table.dropForeign('user_id')
      table.foreign('user_id').references('id').inTable('users')

      // Pour account_id
      table.dropForeign('account_id')
      table.foreign('account_id').references('id').inTable('accounts')
    })
  }
}