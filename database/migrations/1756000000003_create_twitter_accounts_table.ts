import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'twitter_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('user_id').notNullable()
      table.string('twitter_user_id').notNullable()
      table.string('username').notNullable()
      table.string('display_name').nullable()
      table.string('access_token').notNullable()
      table.string('access_token_secret').notNullable()
      table.string('profile_image_url').nullable()
      table.text('bio').nullable()
      table.integer('followers_count').defaultTo(0)
      table.integer('following_count').defaultTo(0)
      table.integer('posts_count').defaultTo(0)
      table.boolean('is_rate_limited').defaultTo(false)
      table.timestamp('rate_limit_reset').nullable()
      table.json('settings').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Foreign key
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      
      // Unique constraint for one Twitter account per user
      table.unique(['user_id', 'twitter_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
