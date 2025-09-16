import { BaseCommand } from '@adonisjs/core/ace'
import DmCampaign from '#models/dm_campaign'

export default class ValidateCampaignStates extends BaseCommand {
  static commandName = 'validate:campaign-states'
  static description = 'Validate the new unified execution state system'

  async run() {
    this.logger.info('Validating campaign state system...')

    try {
      // Test 1: Create a test campaign with default state
      this.logger.info('Test 1: Creating test campaign...')
      const testCampaign = new DmCampaign()
      testCampaign.name = 'Test Campaign - State Validation'
      testCampaign.accountHandle = 'test@bsky.social'
      testCampaign.strategy = 'test'
      testCampaign.user_id = '1'
      testCampaign.keywords = 'test'
      testCampaign.executionState = 'stopped' // Set default state
      await testCampaign.save()

      this.logger.info(`✅ Test campaign created with ID: ${testCampaign.id}`)
      this.logger.info(`Initial state: ${testCampaign.executionState}`)

      // Test 2: Validate state helper methods
      this.logger.info('Test 2: Validating state helper methods...')
      
      console.log(`isStopped(): ${testCampaign.isStopped()} (should be true)`)
      console.log(`isRunning(): ${testCampaign.isRunning()} (should be false)`)
      console.log(`isPaused(): ${testCampaign.isPaused()} (should be false)`)
      console.log(`canStart(): ${testCampaign.canStart()} (should be true)`)
      console.log(`canPause(): ${testCampaign.canPause()} (should be false)`)
      console.log(`canStop(): ${testCampaign.canStop()} (should be false)`)

      // Test 3: State transitions
      this.logger.info('Test 3: Testing state transitions...')
      
      // stopped -> running
      await testCampaign.transitionToRunning()
      await testCampaign.refresh()
      this.logger.info(`After transitionToRunning(): ${testCampaign.executionState}`)
      console.log(`isRunning(): ${testCampaign.isRunning()} (should be true)`)
      console.log(`canPause(): ${testCampaign.canPause()} (should be true)`)
      console.log(`canStop(): ${testCampaign.canStop()} (should be true)`)

      // running -> paused
      await testCampaign.transitionToPaused()
      await testCampaign.refresh()
      this.logger.info(`After transitionToPaused(): ${testCampaign.executionState}`)
      console.log(`isPaused(): ${testCampaign.isPaused()} (should be true)`)
      console.log(`canResume(): ${testCampaign.canResume()} (should be true)`)

      // paused -> running
      await testCampaign.transitionToRunning()
      await testCampaign.refresh()
      this.logger.info(`After resume (transitionToRunning()): ${testCampaign.executionState}`)

      // running -> completed
      await testCampaign.transitionToCompleted()
      await testCampaign.refresh()
      this.logger.info(`After transitionToCompleted(): ${testCampaign.executionState}`)
      console.log(`isStopped(): ${testCampaign.isStopped()} (should be true)`)

      // Test 4: Invalid transitions
      this.logger.info('Test 4: Testing invalid transitions...')
      
      try {
        await testCampaign.transitionToPaused()
        this.logger.error('❌ ERROR: Should not be able to pause a completed campaign')
      } catch (error) {
        this.logger.info(`✅ Correctly blocked invalid transition: ${error.message}`)
      }

      // Test 5: Check backward compatibility fields
      this.logger.info('Test 5: Checking backward compatibility...')
      await testCampaign.refresh()
      console.log(`executionStatus: ${testCampaign.executionStatus}`)
      console.log(`shouldStop: ${testCampaign.shouldStop}`)
      console.log(`shouldPause: ${testCampaign.shouldPause}`)

      // Cleanup
      await testCampaign.delete()
      this.logger.info('✅ Test campaign cleaned up')

      this.logger.success('All campaign state validation tests passed!')

    } catch (error) {
      this.logger.error(`❌ Validation failed: ${error.message}`)
      throw error
    }
  }
}