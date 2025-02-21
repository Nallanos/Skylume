import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaign_convos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer("dm_campaign_id").references("dm_campaigns.id").onDelete("CASCADE")
      table.string("convo_id").references("convos.id").onDelete("CASCADE")
      table.string("convo_did").references("convos.did").onDelete("CASCADE")

      table.unique(['dm_campaign_id', 'convo_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}