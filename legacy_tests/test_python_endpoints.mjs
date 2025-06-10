#!/usr/bin/env node

import fetch from 'node-fetch'
import 'dotenv/config'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3333'
const API_KEY = process.env.INTERNAL_API_KEY || 'test-api-key'

/**
 * Test the Python API endpoints with proper error handling
 */
async function testPythonEndpoints() {
  console.log('🧪 Testing Python API endpoints...')
  console.log(`Base URL: ${BASE_URL}`)

  // Test 1: Health check
  console.log('\n1. Testing health endpoint...')
  try {
    const response = await fetch(`${BASE_URL}/internal/python/health`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    })

    const result = await response.text()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response: ${result}`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }

  // Test 2: Send valid JSON to complete-job endpoint
  console.log('\n2. Testing complete-job with valid JSON...')
  try {
    const payload = {
      jobId: `test-job-${Date.now()}`,
      analysisId: '999999', // Non-existent analysis ID for testing
      success: true,
      results: {
        clustersData: [
          {
            tag: 'test-cluster',
            handles: ['test.bsky.social'],
            keywords: ['test'],
            embedding: [0.1, 0.2, 0.3],
            size: 1,
            cohesion: 0.8
          }
        ],
        totalAnalyzed: 1
      }
    }

    const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(payload)
    })

    const result = await response.text()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response: ${result}`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }

  // Test 3: Send invalid JSON
  console.log('\n3. Testing complete-job with invalid JSON...')
  try {
    const invalidJson = '{"jobId": "test", "invalid": }'

    const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: invalidJson
    })

    const result = await response.text()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response: ${result}`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }

  // Test 4: Send HTML instead of JSON
  console.log('\n4. Testing complete-job with HTML content...')
  try {
    const htmlContent = '<html><body>This is HTML, not JSON</body></html>'

    const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: htmlContent
    })

    const result = await response.text()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response: ${result}`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }

  // Test 5: Missing Content-Type header
  console.log('\n5. Testing complete-job without Content-Type...')
  try {
    const payload = { jobId: 'test', success: true }

    const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY
        // No Content-Type header
      },
      body: JSON.stringify(payload)
    })

    const result = await response.text()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response: ${result}`)
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }

  console.log('\n✅ Testing completed!')
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPythonEndpoints()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}

export { testPythonEndpoints }
