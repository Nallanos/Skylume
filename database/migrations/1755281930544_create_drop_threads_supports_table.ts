import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {

  async up() {
    await this.schema.raw(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'threads_access_token') THEN
          ALTER TABLE accounts DROP COLUMN threads_access_token;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'threads_user_id') THEN
          ALTER TABLE accounts DROP COLUMN threads_user_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'threads_username') THEN
          ALTER TABLE accounts DROP COLUMN threads_username;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'threads_rate_limited') THEN
          ALTER TABLE accounts DROP COLUMN threads_rate_limited;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'threads_rate_limit_reset') THEN
          ALTER TABLE accounts DROP COLUMN threads_rate_limit_reset;
        END IF;
      END $$;
    `)

    await this.schema.raw(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedulings' AND column_name = 'threads_account_id') THEN
          ALTER TABLE schedulings DROP COLUMN threads_account_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedulings' AND column_name = 'threads_settings') THEN
          ALTER TABLE schedulings DROP COLUMN threads_settings;
        END IF;
      END $$;
    `)

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

    this.schema.alterTable('accounts', (table) => {
      table.string('threads_access_token').nullable()
      table.string('threads_user_id').nullable()
      table.string('threads_username').nullable()
      table.boolean('threads_rate_limited').defaultTo(false)
      table.timestamp('threads_rate_limit_reset').nullable()
    })

    this.schema.alterTable('schedulings', (table) => {
      table.integer('threads_account_id').unsigned().nullable().references('id').inTable('threads_accounts')
      table.text('threads_settings').nullable()
    })
  }
}