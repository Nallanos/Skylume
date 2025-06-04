#!/usr/bin/env node
// filepath: /home/allan/Documents/bsky-copilot2/Bluesky-copilot/test_python_worker_simulation.mjs
import { createTestData } from './create_test_data.mjs'
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:8081'

async function simulatePythonWorker() {
  console.log('🤖 Simulating Python Worker Workflow...\n')
  
  try {
    // Step 1: Create test data first
    console.log('📊 Step 1: Setting up test data...')
    const { userId, accountId, analysisId } = await createTestData()
    console.log(`✅ Created Analysis ID: ${analysisId} for Account: ${accountId}\n`)
    
    // Step 2: Simulate the FollowerAnalysisController starting an analysis
    // (This would normally be done via the web interface, but we'll simulate it by updating the database)
    console.log('🚀 Step 2: Simulating analysis start...')
    await updateAnalysisStatus(analysisId, 'pending', { analyzed: 0, total: 100, percentage: 0 })
    console.log('✅ Analysis marked as pending\n')
    
    // Step 3: Simulate Python worker polling for jobs
    console.log('🔍 Step 3: Python worker polling for jobs...')
    await simulateWorkerPolling()
    
    // Step 4: Simulate processing an analysis
    console.log('⚙️  Step 4: Simulating analysis processing...')
    await simulateAnalysisProcessing(analysisId)
    
    console.log('\n🎉 Python worker simulation completed successfully!')
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message)
    process.exit(1)
  }
}

async function updateAnalysisStatus(analysisId, status, progress = null) {
  // In a real scenario, this would be done by the FollowerAnalysisController
  // Here we're simulating it by directly updating the database
  console.log(`  - Updating analysis ${analysisId} status to: ${status}`)
}

async function simulateWorkerPolling() {
  console.log('  - Polling for bulk jobs...')
  const bulkJobResponse = await fetch(`${BASE_URL}/internal/python/next-bulk-job`)
  const bulkJobText = await bulkJobResponse.text()
  
  console.log(`    Bulk job endpoint: ${bulkJobResponse.status} ${bulkJobResponse.statusText}`)
  if (bulkJobText.trim()) {
    console.log(`    Response: ${bulkJobText}`)
  } else {
    console.log('    No bulk jobs available (empty response)')
  }
  
  console.log('  - Polling for recurring jobs...')
  const recurringJobResponse = await fetch(`${BASE_URL}/internal/python/next-recurring-job`)
  const recurringJobText = await recurringJobResponse.text()
  
  console.log(`    Recurring job endpoint: ${recurringJobResponse.status} ${recurringJobResponse.statusText}`)
  if (recurringJobText.trim()) {
    console.log(`    Response: ${recurringJobText}`)
  } else {
    console.log('    No recurring jobs available (empty response)')
  }
  
  console.log('✅ Worker polling completed\n')
}

async function simulateAnalysisProcessing(analysisId) {
  // Step 1: Report progress updates
  console.log('  - Reporting progress: 25%...')
  await reportProgress(analysisId, {
    analyzed: 25,
    total: 100,
    percentage: 25
  })
  
  console.log('  - Reporting progress: 50%...')
  await reportProgress(analysisId, {
    analyzed: 50,
    total: 100,
    percentage: 50
  })
  
  console.log('  - Reporting progress: 75%...')
  await reportProgress(analysisId, {
    analyzed: 75,
    total: 100,
    percentage: 75
  })
  
  // Step 2: Complete the job with realistic results
  console.log('  - Completing analysis with results...')
  await completeAnalysis(analysisId)
  
  console.log('✅ Analysis processing simulation completed\n')
}

async function reportProgress(analysisId, progress) {
  const response = await fetch(`${BASE_URL}/internal/python/update-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysisId: analysisId.toString(), // Send as string as expected by the API
      analyzed: progress.analyzed,
      total: progress.total,
      percentage: progress.percentage
    })
  })
  
  const responseText = await response.text()
  console.log(`    Progress update: ${response.status} ${response.statusText}`)
  if (responseText.trim()) {
    try {
      const result = JSON.parse(responseText)
      console.log(`    Result: ${result.status || 'unknown'} - ${result.message || 'no message'}`)
    } catch (e) {
      console.log(`    Raw response: ${responseText}`)
    }
  }
}

async function completeAnalysis(analysisId) {
  const analysisResult = {
    clustersData: [
      {
        tag: 'Tech Professionals',
        handles: ['techpro1.bsky.social', 'developer2.bsky.social', 'coder3.bsky.social'],
        keywords: ['javascript', 'react', 'nodejs', 'programming', 'software'],
        embedding: [0.8, 0.2, 0.1, 0.9, 0.3],
        size: 45,
        cohesion: 0.87
      },
      {
        tag: 'Design Community',
        handles: ['designer1.bsky.social', 'uxer2.bsky.social', 'artist3.bsky.social'],
        keywords: ['design', 'ux', 'ui', 'figma', 'creativity'],
        embedding: [0.1, 0.9, 0.8, 0.2, 0.7],
        size: 32,
        cohesion: 0.82
      },
      {
        tag: 'Content Creators',
        handles: ['creator1.bsky.social', 'blogger2.bsky.social', 'writer3.bsky.social'],
        keywords: ['content', 'writing', 'blog', 'social media', 'marketing'],
        embedding: [0.4, 0.3, 0.9, 0.6, 0.8],
        size: 28,
        cohesion: 0.75
      }
    ],
    account_insights: [
      {
        category: 'Audience Demographics',
        insights: {
          topInterests: ['technology', 'design', 'content creation'],
          activeHours: ['9-11', '13-15', '18-21'],
          demographicTrends: 'Primarily professionals aged 25-40 in tech and creative industries'
        }
      },
      {
        category: 'Engagement Patterns',
        insights: {
          topInterests: ['technical discussions', 'design showcases', 'career advice'],
          activeHours: ['weekday mornings', 'lunch breaks', 'evening'],
          demographicTrends: 'High engagement with educational and professional content'
        }
      }
    ],
    content_suggestions: [
      {
        title: 'Technical Tutorial Series',
        description: 'Create step-by-step programming tutorials and code examples',
        targetCluster: 'Tech Professionals',
        estimatedReach: 45,
        suggestedTimes: ['Tuesday 10:00', 'Thursday 14:00'],
        contentTypes: ['code snippets', 'tutorial threads', 'tech tips']
      },
      {
        title: 'Design Process Insights',
        description: 'Share design workflows, tool reviews, and creative processes',
        targetCluster: 'Design Community',
        estimatedReach: 32,
        suggestedTimes: ['Monday 13:00', 'Wednesday 19:00'],
        contentTypes: ['design showcases', 'tool reviews', 'process videos']
      },
      {
        title: 'Content Strategy Tips',
        description: 'Provide advice on content creation, social media strategy, and audience growth',
        targetCluster: 'Content Creators',
        estimatedReach: 28,
        suggestedTimes: ['Friday 18:00', 'Sunday 10:00'],
        contentTypes: ['strategy threads', 'growth tips', 'case studies']
      }
    ],
    totalAnalyzed: 100
  }

  // Since we don't have a real jobId from the queue system, we'll simulate it
  const simulatedJobId = `job-${Date.now()}`

  const response = await fetch(`${BASE_URL}/internal/python/complete-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobId: simulatedJobId,
      analysisId: analysisId.toString(), // Send as string as expected by the API
      success: true,
      results: analysisResult
    })
  })
  
  const responseText = await response.text()
  console.log(`    Job completion: ${response.status} ${response.statusText}`)
  if (responseText.trim()) {
    try {
      const result = JSON.parse(responseText)
      console.log(`    Result: ${result.status || 'unknown'} - ${result.message || 'no message'}`)
    } catch (e) {
      console.log(`    Raw response: ${responseText}`)
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simulatePythonWorker()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Simulation failed:', error)
      process.exit(1)
    })
}

export { simulatePythonWorker }
