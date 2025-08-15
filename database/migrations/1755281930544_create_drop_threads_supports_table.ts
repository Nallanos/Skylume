import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {

  async up() {
    // Supprimer les colonnes Threads de la table accounts
    this.schema.alterTable('accounts', (table) => {
      table.dropColumn('threads_access_token')
      table.dropColumn('threads_user_id')
      table.dropColumn('threads_username')
      table.dropColumn('threads_rate_limited')
      table.dropColumn('threads_rate_limit_reset')
    })

    // Supprimer les colonnes Threads de la table schedulings
    this.schema.alterTable('schedulings', (table) => {
      table.dropColumn('threads_account_id')
      table.dropColumn('threads_settings')
    })

    // Supprimer la table threads_accounts si elle existe
    this.schema.dropTableIfExists('threads_accounts')
  }

  async down() {
    // Recréer la table threads_accounts
    this.schema.createTable('threads_accounts', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('username').notNullable()
      table.string('display_name').nullable()
      table.string('access_token').notNullable()
      table.string('refresh_token').nullable()
      table.string('threads_user_id').notNullable()
      table.integer('followers_count').defaultTo(0)
      table.integer('following_count').defaultTo(0)
      table.string('profile_image_url').nullable()
      table.boolean('is_rate_limited').defaultTo(false)
      table.timestamp('rate_limit_reset').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // Recréer les colonnes Threads dans accounts
    this.schema.alterTable('accounts', (table) => {
      table.string('threads_access_token').nullable()
      table.string('threads_user_id').nullable()
      table.string('threads_username').nullable()
      table.boolean('threads_rate_limited').defaultTo(false)
      table.timestamp('threads_rate_limit_reset').nullable()
    })

    // Recréer les colonnes Threads dans schedulings
    this.schema.alterTable('schedulings', (table) => {
      table.integer('threads_account_id').unsigned().nullable().references('id').inTable('threads_accounts')
      table.text('threads_settings').nullable()
    })
  }
}