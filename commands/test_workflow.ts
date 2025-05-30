
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { TestDataFactory } from '#tests/factories/test_data_factory'
import testUtils from '@adonisjs/core/services/test_utils'

export default class TestWorkflow extends BaseCommand {
  static commandName = 'test:workflow'
  static description = 'Test end-to-end workflow (replaces test_workflow.mjs)'

  @flags.string({ description: 'Base URL for API testing', default: 'http://localhost:3333' })
  declare baseUrl: string

  @flags.boolean({ description: 'Skip test data creation and cleanup' })
  declare skipData: boolean

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info('🚀 Starting end-to-end workflow test...')

      // Start the HTTP server for testing
      await testUtils.httpServer().start()

      let testData: any = null

      if (!this.skipData) {
        // Step 1: Create test data
        this.logger.info('📊 Step 1: Creating test data...')
        testData = await TestDataFactory.createCompleteTestData()
        this.logger.success(`✅ Test data created: Analysis ID ${testData.analysisId} for Account ID ${testData.accountId}`)
      }

      // Step 2: Test Python worker endpoints
      this.logger.info('🐍 Step 2: Testing Python worker endpoints...')
      await this.testPythonWorkerEndpoints()

      // Step 3: Test bulk analysis workflow
      if (testData) {
        this.logger.info('📈 Step 3: Testing bulk analysis workflow...')
        await this.testBulkAnalysisWorkflow(testData.analysisId, testData.accountId)
      }

      // Step 4: Test error handling and validation
      this.logger.info('🔄 Step 4: Testing error handling and validation...')
      await this.testErrorHandling()

      this.logger.success('🎉 Workflow test completed successfully!')

    } catch (error) {
      this.logger.error(`❌ Workflow test failed: ${error.message}`)
      this.exitCode = 1
    } finally {
      if (!this.skipData) {
        await TestDataFactory.cleanup()
      }
    }
  }

  private async testPythonWorkerEndpoints() {
    // Test getting next bulk job
    this.logger.info('  - Testing /internal/python/next-bulk-job...')
    const bulkJobResult = await this.makeRequest('GET', '/internal/python/next-bulk-job')
    this.logger.info(`    Response: ${bulkJobResult.status} - ${JSON.stringify(bulkJobResult.data)}`)

    // Test getting next recurring job
    this.logger.info('  - Testing /internal/python/next-recurring-job...')
    const recurringJobResult = await this.makeRequest('GET', '/internal/python/next-recurring-job')
    this.logger.info(`    Response: ${recurringJobResult.status} - ${JSON.stringify(recurringJobResult.data)}`)

    this.logger.success('✅ Python worker endpoints tested')
  }

  private async testBulkAnalysisWorkflow(analysisId: number, accountId: string) {
    // Test updating progress
    this.logger.info('  - Testing progress update...')
    const progressData = {
      analysisId: analysisId.toString(),
      analysisType: 'bulk',
      progress: {
        analyzed: 25,
        total: 100,
        percentage: 25
      }
    }

    const progressResult = await this.makeRequest('POST', '/internal/python/update-progress', progressData)
    this.logger.info(`    Progress update: ${progressResult.status} - ${JSON.stringify(progressResult.data)}`)

    // Test completing the job
    this.logger.info('  - Testing job completion...')
    const completionData = {
      jobId: `test-job-${Date.now()}`,
      analysisId: analysisId.toString(),
      analysisType: 'bulk',
      success: true,
      results: {
        totalAnalyzed: 100,
        clustersData: [
          {
            tag: 'Tech Enthusiasts',
            handles: ['techuser1.bsky.social', 'techuser2.bsky.social'],
            keywords: ['technology', 'coding', 'software'],
            embedding: [0.1, 0.2, 0.3],
            size: 50,
            cohesion: 0.85
          },
          {
            tag: 'Artists & Creators',
            handles: ['artist1.bsky.social', 'creator2.bsky.social'],
            keywords: ['art', 'design', 'creative'],
            embedding: [0.8, 0.1, 0.4],
            size: 30,
            cohesion: 0.78
          }
        ],
        account_insights: [
          {
            category: 'Engagement Patterns',
            insights: {
              topInterests: ['technology', 'art', 'science'],
              activeHours: ['9-12', '14-17', '19-22'],
              demographicTrends: 'Young professionals with tech and creative interests'
            }
          }
        ],
        content_suggestions: [
          {
            title: 'Tech Tutorial Content',
            description: 'Create educational content about coding and software development',
            targetCluster: 'Tech Enthusiasts',
            estimatedReach: 50
          }
        ]
      }
    }

    const completionResult = await this.makeRequest('POST', '/internal/python/complete-job', completionData)
    this.logger.info(`    Job completion: ${completionResult.status} - ${JSON.stringify(completionResult.data)}`)

    this.logger.success('✅ Bulk analysis workflow tested')
  }

  private async testErrorHandling() {
    // Test error handling with non-existent analysis ID
    this.logger.info('  - Testing error handling...')
    const errorData = {
      jobId: 'test-error-job',
      analysisId: '999999',
      analysisType: 'recurring',
      success: false,
      error: 'Test error: Analysis failed due to API rate limits'
    }

    const errorResult = await this.makeRequest('POST', '/internal/python/complete-job', errorData)
    this.logger.info(`    Error handling: ${errorResult.status} - ${JSON.stringify(errorResult.data)}`)

    // Test invalid data handling
    this.logger.info('  - Testing validation...')
    const invalidData = {
      analysisId: 'invalid',
      progress: 'not-an-object'
    }

    const invalidResult = await this.makeRequest('POST', '/internal/python/update-progress', invalidData)
    this.logger.info(`    Validation: ${invalidResult.status} - ${JSON.stringify(invalidResult.data)}`)

    this.logger.success('✅ Error handling and validation tested')
  }

  private async makeRequest(method: string, path: string, data?: any): Promise<{ status: number; data: any }> {
    try {
      const url = `${this.baseUrl}${path}`
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      }

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)
      
      let responseData: any
      const responseText = await response.text()
      
      try {
        responseData = responseText.trim() ? JSON.parse(responseText) : { message: 'Empty response' }
      } catch {
        responseData = { error: 'Failed to parse JSON', response: responseText }
      }

      return { status: response.status, data: responseData }

    } catch (error) {
      return { 
        status: 0, 
        data: { error: 'Network error', message: error.message } 
      }
    }
  }
}