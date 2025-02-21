import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AccountStat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number
}