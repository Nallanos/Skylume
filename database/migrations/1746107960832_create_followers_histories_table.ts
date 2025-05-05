import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Clé étrangère vers la table users
      table.string('user_id').notNullable().references('id').inTable('users')

      // Nombre total de followers pour cette journée
      table.integer('followers_count').notNullable().defaultTo(0)

      // Date d'enregistrement (jour seulement, sans l'heure)
      table.date('recorded_at').notNullable()

      // Index pour optimiser les requêtes par user_id et date
      table.index(['user_id', 'recorded_at'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}