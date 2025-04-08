import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Follower extends BaseModel {
  @column({ isPrimary: true })
  declare handle: string

  @column()
  declare interest: string[]
}