import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.dropTable('listeners_convos')
    this.schema.dropTable('listeners')
  }

  public async down() {
    this.schema.createTable('listeners', (table) => {
      table.string("id").unique().nullable().primary()
      table.string("account_id").references("accounts.id").onDelete('CASCADE')
      table.string("event")
      table.string("user_id").references("users.id").onDelete("CASCADE")
      table.string("handler")
      table.float("wait_time")
      table.string("action")
      table.boolean("is_active").defaultTo(true)
      table.string("message")
      table.integer("number_of_message_sent").defaultTo(0)
      table.integer("number_of_message_received").defaultTo(0)
      table.string("followers_cursor").nullable()
      table.boolean("state_send_to_all").nullable()
    })

    this.schema.createTable('listeners_convos', (table) => {
      table.increments('id')
      table.string('listeners_id').unsigned().references("listeners.id").onDelete("CASCADE")
      table.string('convo_id').unsigned().references("convos.id").onDelete("CASCADE")
      table.string('convo_did').unsigned().references("convos.did").onDelete("CASCADE")
      table.unique(['listeners_id', 'convo_id'])
      table.string("last_message_sent_at").notNullable()
    })
  }
}
