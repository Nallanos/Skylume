import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listeners_convos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('listeners_id').unsigned().references("listeners.id").onDelete("CASCADE")
      table.string('convo_id').unsigned().references("convos.id").onDelete("CASCADE")
      table.string('convo_did').unsigned().references("convos.did").onDelete("CASCADE")
      table.unique(['listeners_id', 'convo_id'])
      table.string("last_message_sent_at").notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}