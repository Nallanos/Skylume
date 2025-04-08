import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Feed extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string

  @column()
  declare keywordsCursor: { [key: string]: string | null }

  @column()
  declare userId: string

  @column()
  declare accountHandle: string
}