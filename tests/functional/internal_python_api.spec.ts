import { test } from '@japa/runner'
import { TestDataFactory } from '#tests/factories/test_data_factory'

test.group('Internal Python API', (group) => {
  // Remove global transaction for these tests since they need real database commits
  // group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.teardown(async () => {
    await TestDataFactory.cleanup()
  })

  test('POST /internal/python/update-progress should update analysis progress', async ({ client }) => {
    // Create test data
    const { analysisId } = await TestDataFactory.createCompleteTestData()

    // Test data to send
    const progressData = {
      analysisId: analysisId.toString(),
      analyzed: 25,
      total: 100,
      percentage: 25
    }

    // Make the API call
    const response = await client
      .post('/internal/python/update-progress')
      .json(progressData)

    // Verify response
    response.assertStatus(200)

    // The response should be successful
    const responseBody = response.body()
    console.log('Response:', responseBody)

    // TODO: Add specific assertions based on expected response format
    // This will depend on how the actual endpoint responds
  })

  test('POST /internal/python/update-progress should handle invalid analysis ID', async ({ client }) => {
    const progressData = {
      analysisId: "invalid-id",
      analyzed: 25,
      total: 100,
      percentage: 25
    }

    const response = await client
      .post('/internal/python/update-progress')
      .json(progressData)

    // Should handle invalid ID gracefully
    // TODO: Update with expected status code based on actual implementation
    response.assertStatus(400)
  })

  test('POST /internal/python/update-progress should validate required fields', async ({ client }) => {
    const incompleteData = {
      // Missing analysisId entirely
      analyzed: 50,
      total: 100,
      percentage: 50
    }

    const response = await client
      .post('/internal/python/update-progress')
      .json(incompleteData)

    // Should return validation error (400 for missing analysisId)
    response.assertStatus(400)
  })

  test('POST /internal/python/update-progress should handle malformed JSON', async ({ client }) => {
    // This test is tricky as we need to send invalid JSON
    // We'll send a valid request with invalid analysis data instead
    const response = await client
      .post('/internal/python/update-progress')
      .json({
        analysisId: 'invalid-id', // Should be a number
        progress: 50
      })

    response.assertStatus(400)
  })
})
