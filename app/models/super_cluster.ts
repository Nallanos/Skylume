import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SuperCluster extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare tag: string

    @column()
    declare handles: string[] | null

    @column()
    declare size: number

    @column()
    declare accountHandle: string

    @column()
    declare embeddings: number[] | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
