import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Colonnes pour le suivi des limites du plan
      table.integer('follower_loadings_this_month').defaultTo(0)
      table.integer('daily_follow_actions_count').defaultTo(0)
      table.date('last_follow_action_date').nullable()
      
      // Colonnes pour les statistiques de performance
      table.text('plan_limits_reached').nullable() // JSON des limites atteintes
      table.timestamp('plan_upgraded_at').nullable()
      table.timestamp('plan_downgraded_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('follower_loadings_this_month')
      table.dropColumn('daily_follow_actions_count')
      table.dropColumn('last_follow_action_date')
      table.dropColumn('plan_limits_reached')
      table.dropColumn('plan_upgraded_at')
      table.dropColumn('plan_downgraded_at')
    })
  }
}