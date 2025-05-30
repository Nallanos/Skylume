import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'analysis_audiences'

  async up() {
    // Peupler les enregistrements existants avec le handle du compte
    await this.raw(`
      UPDATE analysis_audiences 
      SET account_handle = accounts.handle 
      FROM accounts 
      WHERE analysis_audiences.account_id = accounts.id::text 
      AND analysis_audiences.account_handle IS NULL
    `)

    // Rendre la colonne non-nullable après avoir peuplé les données
    this.schema.alterTable(this.tableName, (table) => {
      table.string('account_handle').notNullable().alter()
    })
  }

  async down() {
    // Rendre la colonne nullable à nouveau
    this.schema.alterTable(this.tableName, (table) => {
      table.string('account_handle').nullable().alter()
    })
  }
}