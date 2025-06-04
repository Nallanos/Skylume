import pg from 'pg'
import { DateTime } from 'luxon'
import { config } from 'dotenv'

// Load environment variables
config()

/**
 * Script to create test data for the audience analysis workflow
 */

async function createTestData() {
  console.log('Starting test data creation...')
  
  // Create PostgreSQL client
  const client = new pg.Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'blueskybluesky',
    password: process.env.DB_PASSWORD || 'blueskybluesky',
    database: process.env.DB_DATABASE || 'blueskybluesky',
  })
  
  console.log('Connecting to database...')
  await client.connect()
  console.log('Connected to database successfully!')
  
  try {
    console.log('Creating test data for audience analysis workflow...')
    
    // 1. Create a test user
    const userId = 'test-user-' + Date.now()
    const userEmail = `test-${Date.now()}@example.com`
    await client.query(`
      INSERT INTO users (id, email, password, plan, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, userEmail, 'hashed_password', 'pro', DateTime.now().toSQL(), DateTime.now().toSQL()])
    console.log(`✅ Created test user: ${userId} (${userEmail})`)
    
    // 2. Create a test account
    const accountId = 'test-account-' + Date.now()
    const accountHandle = `testuser-${Date.now()}.bsky.social`
    await client.query(`
      INSERT INTO accounts (id, user_id, handle, did, app_password, session, seen_notification_at, number_of_followers, numbers_of_followers_analyzed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [accountId, userId, accountHandle, 'did:plc:test123', 'test-password', '{}', DateTime.now().toSQL(), 5000, 100])
    console.log(`✅ Created test account: ${accountId} (${accountHandle})`)
    
    // 3. Create a test analysis
    const analysisResult = await client.query(`
      INSERT INTO analysis_audiences (account_id, status, queue_job_id, progress, result, error_message, started_at, completed_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [accountId, 'pending', null, JSON.stringify({ analyzed: 0, total: 100, percentage: 0 }), null, null, null, null, DateTime.now().toSQL(), DateTime.now().toSQL()])
    
    const analysisId = analysisResult.rows[0].id
    console.log(`✅ Created test analysis: ${analysisId}`)
    
    console.log(`
Test data created successfully!
- User ID: ${userId}
- Account ID: ${accountId}  
- Analysis ID: ${analysisId}

Next steps:
1. Use FollowerAnalysisController.analyzeAudience() to queue the analysis
2. Test the Python worker endpoints with real data
3. Verify the complete workflow from queue → worker → completion
    `)
    
    return { userId, accountId, analysisId }
    
  } catch (error) {
    console.error('Error creating test data:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to create test data:', error)
      process.exit(1)
    })
}

export { createTestData }
