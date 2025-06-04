#!/usr/bin/env node
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:8081'

console.log('🔍 Testing API endpoint with debug information...\n')

async function testProgressEndpoint() {
  const testData = {
    analysisId: "7",
    analyzed: 25,
    total: 100,
    percentage: 25
  }
  
  console.log('📤 Sending request:')
  console.log('URL:', `${BASE_URL}/internal/python/update-progress`)
  console.log('Method:', 'POST')
  console.log('Headers:', { 'Content-Type': 'application/json' })
  console.log('Body (object):', testData)
  console.log('Body (JSON string):', JSON.stringify(testData))
  console.log()
  
  try {
    const response = await fetch(`${BASE_URL}/internal/python/update-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📥 Response received:')
    console.log('Status:', response.status, response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Raw response text:', responseText)
    
    if (responseText.trim()) {
      try {
        const result = JSON.parse(responseText)
        console.log('Parsed response:', result)
      } catch (parseError) {
        console.log('JSON parse error:', parseError.message)
      }
    }
    
  } catch (error) {
    console.error('Request error:', error.message)
  }
}

async function testCompleteEndpoint() {
  const testData = {
    jobId: `test-job-${Date.now()}`,
    analysisId: "7",
    success: true,
    results: {
      totalAnalyzed: 100,
      clustersData: []
    }
  }
  
  console.log('\n📤 Testing complete endpoint:')
  console.log('URL:', `${BASE_URL}/internal/python/complete-job`)
  console.log('Body (JSON string):', JSON.stringify(testData))
  
  try {
    const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📥 Response received:')
    console.log('Status:', response.status, response.statusText)
    
    const responseText = await response.text()
    console.log('Raw response text:', responseText)
    
    if (responseText.trim()) {
      try {
        const result = JSON.parse(responseText)
        console.log('Parsed response:', result)
      } catch (parseError) {
        console.log('JSON parse error:', parseError.message)
      }
    }
    
  } catch (error) {
    console.error('Request error:', error.message)
  }
}

// Run tests
testProgressEndpoint()
  .then(() => testCompleteEndpoint())
  .then(() => {
    console.log('\n✅ API endpoint testing completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Testing failed:', error)
    process.exit(1)
  })
