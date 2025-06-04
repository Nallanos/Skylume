#!/usr/bin/env node
// filepath: /home/allan/Documents/bsky-copilot2/Bluesky-copilot/test_workflow.mjs
import { createTestData } from './create_test_data.mjs'
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:8081'

async function testWorkflow() {
  console.log('🚀 Starting end-to-end workflow test...\n')
  
  try {
    // Step 1: Create test data
    console.log('📊 Step 1: Creating test data...')
    const { userId, accountId, analysisId } = await createTestData()
    console.log(`✅ Test data created: Analysis ID ${analysisId} for Account ID ${accountId}\n`)
    
    // Step 2: Simulate the Python worker picking up jobs
    console.log('🐍 Step 2: Testing Python worker endpoints...')
    await testPythonWorkerEndpoints()
    
    // Step 3: Test the bulk analysis workflow
    console.log('📈 Step 3: Testing bulk analysis workflow...')
    await testBulkAnalysisWorkflow(analysisId, accountId)
    
    // Step 4: Test the recurring analysis endpoints
    console.log('🔄 Step 4: Testing recurring analysis endpoints...')
    await testRecurringAnalysisEndpoints()
    
    console.log('\n🎉 Workflow test completed successfully!')
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

async function testPythonWorkerEndpoints() {
  // Test getting next bulk job
  console.log('  - Testing /internal/python/next-bulk-job...')
  const bulkJobResponse = await fetch(`${BASE_URL}/internal/python/next-bulk-job`)
  
  let bulkJobResult
  try {
    const responseText = await bulkJobResponse.text()
    if (responseText.trim()) {
      bulkJobResult = JSON.parse(responseText)
    } else {
      bulkJobResult = { message: 'Empty response' }
    }
  } catch (error) {
    bulkJobResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Response: ${bulkJobResponse.status} - ${JSON.stringify(bulkJobResult)}`)
  
  // Test getting next recurring job
  console.log('  - Testing /internal/python/next-recurring-job...')
  const recurringJobResponse = await fetch(`${BASE_URL}/internal/python/next-recurring-job`)
  
  let recurringJobResult
  try {
    const responseText = await recurringJobResponse.text()
    if (responseText.trim()) {
      recurringJobResult = JSON.parse(responseText)
    } else {
      recurringJobResult = { message: 'Empty response' }
    }
  } catch (error) {
    recurringJobResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Response: ${recurringJobResponse.status} - ${JSON.stringify(recurringJobResult)}`)
  
  console.log('✅ Python worker endpoints tested\n')
}

async function testBulkAnalysisWorkflow(analysisId, accountId) {
  // Test updating progress
  console.log('  - Testing progress update...')
  const progressUpdateResponse = await fetch(`${BASE_URL}/internal/python/update-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysisId: analysisId,
      analysisType: 'bulk',
      progress: {
        analyzed: 25,
        total: 100,
        percentage: 25
      }
    })
  })
  
  let progressResult
  try {
    const responseText = await progressUpdateResponse.text()
    if (responseText.trim()) {
      progressResult = JSON.parse(responseText)
    } else {
      progressResult = { message: 'Empty response' }
    }
  } catch (error) {
    progressResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Progress update: ${progressUpdateResponse.status} - ${JSON.stringify(progressResult)}`)
  
  // Test completing the job
  console.log('  - Testing job completion...')
  const completionResponse = await fetch(`${BASE_URL}/internal/python/complete-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysisId: analysisId,
      analysisType: 'bulk',
      success: true,
      result: {
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
          },
          {
            title: 'Creative Process Posts',
            description: 'Share behind-the-scenes content about creative processes',
            targetCluster: 'Artists & Creators',
            estimatedReach: 30
          }
        ]
      }
    })
  })
  
  let completionResult
  try {
    const responseText = await completionResponse.text()
    if (responseText.trim()) {
      completionResult = JSON.parse(responseText)
    } else {
      completionResult = { message: 'Empty response' }
    }
  } catch (error) {
    completionResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Job completion: ${completionResponse.status} - ${JSON.stringify(completionResult)}`)
  
  console.log('✅ Bulk analysis workflow tested\n')
}

async function testRecurringAnalysisEndpoints() {
  // Test error handling
  console.log('  - Testing error handling...')
  const errorResponse = await fetch(`${BASE_URL}/internal/python/complete-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysisId: 999999, // Non-existent ID
      analysisType: 'recurring',
      success: false,
      errorMessage: 'Test error: Analysis failed due to API rate limits'
    })
  })
  
  let errorResult
  try {
    const responseText = await errorResponse.text()
    if (responseText.trim()) {
      errorResult = JSON.parse(responseText)
    } else {
      errorResult = { message: 'Empty response' }
    }
  } catch (error) {
    errorResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Error handling: ${errorResponse.status} - ${JSON.stringify(errorResult)}`)
  
  // Test invalid data handling
  console.log('  - Testing validation...')
  const invalidResponse = await fetch(`${BASE_URL}/internal/python/update-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Missing required fields
      analysisId: 'invalid',
      progress: 'not-an-object'
    })
  })
  
  let invalidResult
  try {
    const responseText = await invalidResponse.text()
    if (responseText.trim()) {
      invalidResult = JSON.parse(responseText)
    } else {
      invalidResult = { message: 'Empty response' }
    }
  } catch (error) {
    invalidResult = { error: 'Failed to parse JSON', response: responseText }
  }
  
  console.log(`    Validation: ${invalidResponse.status} - ${JSON.stringify(invalidResult)}`)
  
  console.log('✅ Error handling and validation tested\n')
}

// Execute the workflow test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWorkflow()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error)
      process.exit(1)
    })
}

export { testWorkflow }
