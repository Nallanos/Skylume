import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Crossposting configuration
      table.json('crosspost_platforms').nullable() // ['twitter', 'threads', 'bluesky']
      table.boolean('enable_crosspost').defaultTo(false)
      
      // Platform-specific settings
      table.json('twitter_settings').nullable() // Custom settings for Twitter
      table.json('threads_settings').nullable()  // Custom settings for Threads
      
      // Post status tracking per platform
      table.json('platform_statuses').nullable() // { twitter: 'pending', threads: 'posted', bluesky: 'failed' }
      table.json('platform_post_ids').nullable() // Store post IDs from each platform
      table.json('platform_errors').nullable()   // Track errors per platform
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('crosspost_platforms')
      table.dropColumn('enable_crosspost')
      table.dropColumn('twitter_settings')
      table.dropColumn('threads_settings')
      table.dropColumn('platform_statuses')
      table.dropColumn('platform_post_ids')
      table.dropColumn('platform_errors')
    })
  }
}
