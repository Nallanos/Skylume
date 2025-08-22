/*
|--------------------------------------------------------------------------
| Test Campaign Personalization System
|--------------------------------------------------------------------------
|
| This command runs basic validation tests on the new personalization system
| to ensure the database schema and basic functionality work correctly.
|
*/

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class TestCampaignPersonalization extends BaseCommand {
  static commandName = 'test:campaign-personalization'
  static description = 'Run basic validation tests on the campaign personalization system'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('Starting campaign personalization system validation...')

    let passedTests = 0
    let failedTests = 0

    const tests = [
      { name: 'Database Schema Validation', fn: () => this.testDatabaseSchema() },
      { name: 'Data Integrity Tests', fn: () => this.testDataIntegrity() },
      { name: 'Basic Functionality Tests', fn: () => this.testBasicFunctionality() },
    ]

    for (const test of tests) {
      try {
        this.logger.info(`Running: ${test.name}`)
        await test.fn()
        passedTests++
        this.logger.success(`✅ ${test.name} - PASSED`)
      } catch (error) {
        failedTests++
        this.logger.error(`❌ ${test.name} - FAILED: ${error.message}`)
      }
    }

    this.logger.info(`\nTest Results: ✅ ${passedTests} passed, ❌ ${failedTests} failed`)

    if (failedTests > 0) {
      this.logger.error('Some tests failed. Please fix issues before proceeding with migration.')
      process.exit(1)
    } else {
      this.logger.success('All tests passed! System is ready for migration.')
    }
  }

  private async testDatabaseSchema() {
    // Test that all required tables exist
    const tables = [
      'campaign_variables',
      'campaign_groups', 
      'campaign_group_messages'
    ]
    
    for (const table of tables) {
      const result = await db.rawQuery(
        `SELECT table_name FROM information_schema.tables WHERE table_name = ?`,
        [table]
      )
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error(`Table ${table} does not exist`)
      }
    }

    // Test that follower_campaigns has new columns
    const columnsResult = await db.rawQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'follower_campaigns' 
      AND column_name IN ('campaign_group_id', 'followers_count')
    `)

    if (!columnsResult.rows || columnsResult.rows.length < 2) {
      throw new Error('follower_campaigns table missing required new columns')
    }

    this.logger.info('✓ All required tables and columns exist')
  }

  private async testDataIntegrity() {
    // Check for any orphaned records
    const orphanedVariables = await db.rawQuery(`
      SELECT COUNT(*) as count
      FROM campaign_variables cv
      LEFT JOIN campaigns c ON cv.campaign_id = c.id
      WHERE c.id IS NULL
    `)

    if (orphanedVariables.rows[0].count > 0) {
      throw new Error(`Found ${orphanedVariables.rows[0].count} orphaned campaign variables`)
    }

    const orphanedGroups = await db.rawQuery(`
      SELECT COUNT(*) as count
      FROM campaign_groups cg
      LEFT JOIN campaigns c ON cg.campaign_id = c.id
      WHERE c.id IS NULL
    `)

    if (orphanedGroups.rows[0].count > 0) {
      throw new Error(`Found ${orphanedGroups.rows[0].count} orphaned campaign groups`)
    }

    const orphanedMessages = await db.rawQuery(`
      SELECT COUNT(*) as count
      FROM campaign_group_messages cgm
      LEFT JOIN campaign_groups cg ON cgm.campaign_group_id = cg.id
      WHERE cg.id IS NULL
    `)

    if (orphanedMessages.rows[0].count > 0) {
      throw new Error(`Found ${orphanedMessages.rows[0].count} orphaned campaign group messages`)
    }

    this.logger.info('✓ No orphaned records found')
  }

  private async testBasicFunctionality() {
    // Test basic CRUD operations
    const trx = await db.transaction()

    try {
      // Create test campaign
      const campaign = await trx
        .table('campaigns')
        .insert({
          name: 'Test Campaign for Validation',
          account_handle: 'test_handle',
          strategy: 'test',
          keywords: '["test"]',
          target_count: 10,
          analysis_status: 'completed',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id')

      const campaignId = Array.isArray(campaign) && campaign.length > 0 
        ? (campaign[0].id || campaign[0]) 
        : campaign

      // Test variable creation
      await trx
        .table('campaign_variables')
        .insert({
          campaign_id: campaignId,
          name: 'test_variable',
          type: 'follower_count',
          configuration: JSON.stringify({ rounding: 'hundreds' }),
          created_at: new Date(),
          updated_at: new Date(),
        })

      // Test group creation
      const group = await trx
        .table('campaign_groups')
        .insert({
          campaign_id: campaignId,
          name: 'Test Group',
          conditions: JSON.stringify({
            field: 'followers_count',
            operator: 'gte',
            value: '1000'
          }),
          priority: 1,
          estimated_targets: 5,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id')

      const groupId = Array.isArray(group) && group.length > 0 
        ? (group[0].id || group[0]) 
        : group

      // Test message creation
      await trx
        .table('campaign_group_messages')
        .insert({
          campaign_group_id: groupId,
          content: 'Test message with {{test_variable}}',
          weight: 1,
          created_at: new Date(),
          updated_at: new Date(),
        })

      // Verify data was inserted correctly
      const variables = await trx
        .from('campaign_variables')
        .where('campaign_id', campaignId)
        .count('* as count')
        .first()

      if (variables.count !== 1) {
        throw new Error('Variable insertion failed')
      }

      const groups = await trx
        .from('campaign_groups')
        .where('campaign_id', campaignId)
        .count('* as count')
        .first()

      if (groups.count !== 1) {
        throw new Error('Group insertion failed')
      }

      const messages = await trx
        .from('campaign_group_messages')
        .where('campaign_group_id', groupId)
        .count('* as count')
        .first()

      if (messages.count !== 1) {
        throw new Error('Message insertion failed')
      }

      // Test JSON field parsing
      const groupData = await trx
        .from('campaign_groups')
        .where('id', groupId)
        .first()

      const conditions = JSON.parse(groupData.conditions)
      if (!conditions.field || !conditions.operator || !conditions.value) {
        throw new Error('JSON conditions parsing failed')
      }

      const variableData = await trx
        .from('campaign_variables')
        .where('campaign_id', campaignId)
        .first()

      const config = JSON.parse(variableData.configuration)
      if (!config.rounding) {
        throw new Error('JSON configuration parsing failed')
      }

      // Rollback transaction (cleanup)
      await trx.rollback()

      this.logger.info('✓ Basic CRUD operations working correctly')
      this.logger.info('✓ JSON field parsing working correctly')

    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
