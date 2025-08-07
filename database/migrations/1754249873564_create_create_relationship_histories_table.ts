import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'relationship_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Clé étrangère vers la table accounts
      table.string('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE')

      // Comptes pour chaque type de relation
      table.integer('mutual_count').notNullable().defaultTo(0)
      table.integer('i_follow_only_count').notNullable().defaultTo(0)
      table.integer('they_follow_only_count').notNullable().defaultTo(0)
      table.integer('total_count').notNullable().defaultTo(0)

      // Date d'enregistrement (jour seulement, sans l'heure)
      table.date('recorded_at').notNullable()

      // Index pour optimiser les requêtes par account_id et date
      table.index(['account_id', 'recorded_at'])
      table.unique(['account_id', 'recorded_at']) // Une seule entrée par compte par jour

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}