import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.raw('ALTER TABLE dm_campaigns ALTER COLUMN keywords TYPE TEXT;')
    this.schema.raw('ALTER TABLE dm_campaigns ALTER COLUMN exclude_keywords TYPE TEXT;')
  }

  async down() {
    this.schema.raw('ALTER TABLE dm_campaigns ALTER COLUMN keywords TYPE VARCHAR(255);')
    this.schema.raw('ALTER TABLE dm_campaigns ALTER COLUMN exclude_keywords TYPE VARCHAR(255);')
  }
}