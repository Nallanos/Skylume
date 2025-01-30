import { BaseModel, column } from '@adonisjs/lucid/orm'
export default class Listeners_convos extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare listeners_id: string

  @column()
  declare convoId: string

  @column()
  declare convoDid: string

  @column()
  declare last_message_sent_at: string
}