import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dm_campaigns'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('interested_threshold', 3, 2).defaultTo(0.70).comment('Seuil pour la catégorie "interested" (défaut: 0.70)')
      table.decimal('moderately_interested_threshold', 3, 2).defaultTo(0.50).comment('Seuil pour la catégorie "moderately_interested" (défaut: 0.50)')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('interested_threshold')
      table.dropColumn('moderately_interested_threshold')
    })
  }
}