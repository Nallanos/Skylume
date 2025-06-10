import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clusters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the existing foreign key constraint
      table.dropForeign(['super_cluster_id'])

      // Alter the column to be nullable
      table.integer('super_cluster_id').nullable().alter()

      // Re-add the foreign key constraint with nullable support
      table.foreign('super_cluster_id').references('id').inTable('super_clusters').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the foreign key constraint
      table.dropForeign(['super_cluster_id'])

      // Alter the column back to not nullable (but this might fail if there are null values)
      table.integer('super_cluster_id').notNullable().alter()

      // Re-add the foreign key constraint
      table.foreign('super_cluster_id').references('id').inTable('super_clusters').onDelete('CASCADE')
    })
  }
}