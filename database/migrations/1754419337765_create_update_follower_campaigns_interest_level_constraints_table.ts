import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follower_campaigns'

  async up() {
    // Supprimer l'ancienne contrainte
    this.schema.raw('ALTER TABLE follower_campaigns DROP CONSTRAINT IF EXISTS follower_campaigns_interest_level_check')
    
    // Ajouter la nouvelle contrainte avec 'excluded'
    this.schema.raw(`
      ALTER TABLE follower_campaigns 
      ADD CONSTRAINT follower_campaigns_interest_level_check 
      CHECK (interest_level IN ('interested', 'moderately_interested', 'not_interested', 'excluded', 'cannot_determine'))
    `)
  }

  async down() {
    // Supprimer la nouvelle contrainte
    this.schema.raw('ALTER TABLE follower_campaigns DROP CONSTRAINT IF EXISTS follower_campaigns_interest_level_check')
    
    // Remettre l'ancienne contrainte
    this.schema.raw(`
      ALTER TABLE follower_campaigns 
      ADD CONSTRAINT follower_campaigns_interest_level_check 
      CHECK (interest_level IN ('interested', 'moderately_interested', 'not_interested', 'cannot_determine'))
    `)
  }
}