import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('account_id').notNullable().references('id').inTable('accounts')
      table.string('user_id').notNullable().references('id').inTable('users')
      table.string('post_uri').notNullable()
      table.string('post_cid').notNullable()
      table.text('text').notNullable()
      table.integer('likes').defaultTo(0)
      table.integer('reposts').defaultTo(0)
      table.integer('replies').defaultTo(0)
      table.integer('views').defaultTo(0)
      table.timestamp('posted_at').notNullable()

      // Index pour optimiser les requêtes par compte et date
      table.index(['account_id', 'posted_at'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}