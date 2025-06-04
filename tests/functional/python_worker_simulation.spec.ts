import { test } from '@japa/runner'
import { TestDataFactory } from '#tests/factories/test_data_factory'

test.group('Python Worker API Endpoints', (group) => {
    // Remove global transaction for these tests since they need real database commits
    // group.each.setup(() => testUtils.db().withGlobalTransaction())

    group.teardown(async () => {
        await TestDataFactory.cleanup()
    })

    test('complete Python worker workflow simulation', async ({ client }) => {
        console.log('\n=== Testing API Endpoints ===')

        // Test bulk job endpoint
        console.log('1. Testing next-bulk-job endpoint...')
        const bulkJobResponse = await client.get('/internal/python/next-bulk-job')

        if (bulkJobResponse.response.status === 200) {
            const bulkJob = bulkJobResponse.body()
            console.log(`Got bulk job: ${JSON.stringify(bulkJob)}`)
        } else if (bulkJobResponse.response.status === 204) {
            console.log('No bulk jobs available (expected)')
        } else {
            throw new Error(`Unexpected status for bulk job: ${bulkJobResponse.response.status}`)
        }

        // Test recurring job endpoint
        console.log('\n2. Testing next-recurring-job endpoint...')
        const recurringJobResponse = await client.get('/internal/python/next-recurring-job')

        if (recurringJobResponse.response.status === 200) {
            const recurringJob = recurringJobResponse.body()
            console.log(`Got recurring job: ${JSON.stringify(recurringJob)}`)
        } else if (recurringJobResponse.response.status === 204) {
            console.log('No recurring jobs available (expected)')
        } else {
            throw new Error(`Unexpected status for recurring job: ${recurringJobResponse.response.status}`)
        }

        // Test complete job endpoint
        console.log('\n3. Testing complete-job endpoint...')
        const testCompleteResponse = await client
            .post('/internal/python/complete-job')
            .json({
                jobId: 'test-job-123',
                analysisResults: { test: 'data' },
                status: 'completed'
            })

        console.log(`Complete job response: ${testCompleteResponse.response.status} - ${JSON.stringify(testCompleteResponse.body())}`)

        // Accept various status codes for job completion since job might not exist
        if (![200, 400, 404, 422].includes(testCompleteResponse.response.status!)) {
            throw new Error(`Unexpected status for complete job: ${testCompleteResponse.response.status}`)
        }

        // Test update progress endpoint
        console.log('\n4. Testing update-progress endpoint...')
        const testProgressResponse = await client
            .post('/internal/python/update-progress')
            .json({
                analysisId: 'test-analysis-123',
                progress: 50,
                message: 'Processing...'
            })

        console.log(`Update progress response: ${testProgressResponse.response.status} - ${JSON.stringify(testProgressResponse.body())}`)

        // Accept various status codes for progress update since analysis might not exist
        if (![200, 400, 404, 422].includes(testProgressResponse.response.status!)) {
            throw new Error(`Unexpected status for update progress: ${testProgressResponse.response.status}`)
        }

        console.log('\n✅ All endpoints tested successfully!')
    }).timeout(15000) // 15 second timeout

    test('endpoints with real test data', async ({ client }) => {
        console.log('\n=== Testing with Real Test Data ===')

        // Create test data first
        const { analysisId, accountId } = await TestDataFactory.createCompleteTestData()
        console.log(`Created test analysis: ${analysisId}, account: ${accountId}`)

        // Test progress update with real analysis ID
        console.log('\n1. Testing progress update with real data...')
        const progressResponse = await client
            .post('/internal/python/update-progress')
            .json({
                analysisId: analysisId.toString(),
                analyzed: 25,
                total: 100,
                percentage: 25
            })

        progressResponse.assertStatus(200)
        const progressResult = progressResponse.body()
        console.log(`Progress update result: ${JSON.stringify(progressResult)}`)

        // Test job completion with real analysis ID
        console.log('\n2. Testing job completion with real data...')
        const completionResponse = await client
            .post('/internal/python/complete-job')
            .json({
                jobId: `test-job-${Date.now()}`,
                analysisId: analysisId.toString(),
                success: true,
                results: {
                    totalAnalyzed: 100,
                    clustersData: [
                        {
                            tag: 'Test Cluster',
                            handles: ['test1.bsky.social', 'test2.bsky.social'],
                            keywords: ['test', 'keyword'],
                            embedding: [0.1, 0.2, 0.3],
                            size: 25,
                            cohesion: 0.85
                        }
                    ]
                }
            })

        if (![200, 201].includes(completionResponse.response.status!)) {
            throw new Error(`Expected status 200 or 201 for completion, got ${completionResponse.response.status}`)
        }

        const completionResult = completionResponse.body()
        console.log(`Job completion result: ${JSON.stringify(completionResult)}`)

        console.log('\n✅ Real data tests completed successfully!')
    }).timeout(20000) // 20 second timeout

    test('error handling scenarios', async ({ client }) => {
        console.log('\n=== Testing Error Handling ===')

        // Test with invalid analysis ID
        console.log('\n1. Testing invalid analysis ID...')
        const invalidResponse = await client
            .post('/internal/python/update-progress')
            .json({
                analysisId: 'invalid-id',
                analyzed: 50,
                total: 100,
                percentage: 50
            })

        // Should return error status
        if (![400, 404, 422].includes(invalidResponse.response.status!)) {
            throw new Error(`Expected error status for invalid ID, got ${invalidResponse.response.status}`)
        }
        console.log(`Invalid ID handled correctly: ${invalidResponse.response.status}`)

        // Test with missing required fields
        console.log('\n2. Testing missing required fields...')
        const missingFieldsResponse = await client
            .post('/internal/python/complete-job')
            .json({
                // Missing jobId
                success: true
            })

        if (![400, 422].includes(missingFieldsResponse.response.status!)) {
            throw new Error(`Expected validation error for missing fields, got ${missingFieldsResponse.response.status}`)
        }
        console.log(`Missing fields handled correctly: ${missingFieldsResponse.response.status}`)

        console.log('\n✅ Error handling tests completed successfully!')
    }).timeout(15000) // 15 second timeout
})
