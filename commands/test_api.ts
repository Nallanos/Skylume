import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { TestDataFactory } from '#tests/factories/test_data_factory'
import testUtils from '@adonisjs/core/services/test_utils'

export default class TestApi extends BaseCommand {
  static commandName = 'test:api'
  static description = 'Test API endpoints (replaces test_api_debug.mjs)'

  @flags.string({ description: 'Base URL for API testing', default: 'http://localhost:3333' })
  declare baseUrl: string

  @flags.boolean({ description: 'Create test data before running tests' })
  declare createData: boolean

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info('🚀 Starting API endpoint tests...')

      // Start the HTTP server for testing
      await testUtils.httpServer().start()

      let testData: any = null

      if (this.createData) {
        this.logger.info('📊 Creating test data...')
        testData = await TestDataFactory.createCompleteTestData()
        this.logger.success(`✅ Test data created: Analysis ID ${testData.analysisId}`)
      }

      // Test Python worker endpoints
      await this.testPythonWorkerEndpoints()

      // Test with actual data if created
      if (testData) {
        await this.testWithRealData(testData.analysisId)
      }

      this.logger.success('✅ API tests completed successfully!')

    } catch (error) {
      this.logger.error(`❌ API tests failed: ${error.message}`)
      this.exitCode = 1
    } finally {
      if (this.createData) {
        await TestDataFactory.cleanup()
      }
    }
  }

  private async testPythonWorkerEndpoints() {
    this.logger.info('🐍 Testing Python worker endpoints...')

    // Test getting next bulk job
    await this.testEndpoint('GET', '/internal/python/next-bulk-job', null, 'next bulk job')

    // Test getting next recurring job  
    await this.testEndpoint('GET', '/internal/python/next-recurring-job', null, 'next recurring job')

    this.logger.success('✅ Python worker endpoints tested')
  }

  private async testWithRealData(analysisId: number) {
    this.logger.info('📈 Testing with real data...')

    // Test progress update
    const progressData = {
      analysisId: analysisId.toString(),
      analyzed: 25,
      total: 100,
      percentage: 25
    }

    await this.testEndpoint('POST', '/internal/python/update-progress', progressData, 'progress update')

    // Test job completion
    const completionData = {
      jobId: 'test-job-123',
      analysisId: analysisId.toString(),
      success: true,
      results: {
        totalAnalyzed: 100,
        clustersData: [
          {
            tag: 'Test Cluster',
            handles: ['test1.bsky.social', 'test2.bsky.social'],
            keywords: ['test', 'sample'],
            embedding: [0.1, 0.2, 0.3],
            size: 25,
            cohesion: 0.85
          }
        ]
      }
    }

    await this.testEndpoint('POST', '/internal/python/complete-job', completionData, 'job completion')

    this.logger.success('✅ Real data tests completed')
  }

  private async testEndpoint(method: string, path: string, data: any, _description: string) {
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
        responseData = { message: 'Invalid JSON', response: responseText }
      }

      const status = response.status
      const statusText = this.getStatusText(status)

      this.logger.info(`  - ${method} ${path} → ${status} ${statusText}`)

      if (data) {
        this.logger.info(`    Request: ${JSON.stringify(data, null, 2)}`)
      }

      this.logger.info(`    Response: ${JSON.stringify(responseData, null, 2)}`)

      return { status, data: responseData }

    } catch (error) {
      this.logger.error(`  - ${method} ${path} → ERROR: ${error.message}`)
      throw error
    }
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error'
    }

    return statusTexts[status] || 'Unknown'
  }
}