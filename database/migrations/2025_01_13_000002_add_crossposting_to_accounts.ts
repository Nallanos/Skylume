import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Platform identification
      table.string('platform').defaultTo('bluesky') // 'bluesky', 'twitter', 'threads'
      
      // Twitter-specific credentials
      table.string('twitter_access_token').nullable()
      table.string('twitter_access_token_secret').nullable()
      table.string('twitter_user_id').nullable()
      table.string('twitter_username').nullable()
      
      // Threads-specific credentials  
      table.string('threads_access_token').nullable()
      table.string('threads_user_id').nullable()
      table.string('threads_username').nullable()
      
      // Platform-specific settings
      table.json('platform_settings').nullable()
      
      // Rate limiting per platform
      table.boolean('twitter_rate_limited').defaultTo(false)
      table.boolean('threads_rate_limited').defaultTo(false)
      table.timestamp('twitter_rate_limit_reset').nullable()
      table.timestamp('threads_rate_limit_reset').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('platform')
      table.dropColumn('twitter_access_token')
      table.dropColumn('twitter_access_token_secret') 
      table.dropColumn('twitter_user_id')
      table.dropColumn('twitter_username')
      table.dropColumn('threads_access_token')
      table.dropColumn('threads_user_id')
      table.dropColumn('threads_username')
      table.dropColumn('platform_settings')
      table.dropColumn('twitter_rate_limited')
      table.dropColumn('threads_rate_limited')
      table.dropColumn('twitter_rate_limit_reset')
      table.dropColumn('threads_rate_limit_reset')
    })
  }
}
