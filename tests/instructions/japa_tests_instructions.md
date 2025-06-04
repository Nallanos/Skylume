# Testing Instructions for Bluesky Copilot AdonisJS Application

This guide provides comprehensive instructions for testing your AdonisJS application using the Japa testing framework, replacing the independent PostgreSQL script approach with proper AdonisJS testing practices.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Testing](#database-testing)
4. [HTTP/API Testing](#httpapi-testing)
5. [Testing Best Practices](#testing-best-practices)
6. [Replacing create_test_data.mjs](#replacing-create_test_datamjs)
7. [Running Tests](#running-tests)
8. [Debugging Tests](#debugging-tests)

## Testing Setup

### Required Dependencies

The project already includes the core testing dependencies. If you need additional testing tools, install them:

```bash
# HTTP testing
npm i -D @japa/api-client

# Authentication testing
npm i -D @adonisjs/auth/plugins/api_client

# Session testing (if using sessions)
npm i -D @adonisjs/session/plugins/api_client

# CSRF protection testing
npm i -D @adonisjs/shield/plugins/api_client

# Mocking and stubbing
npm i -D sinon @types/sinon

# Time manipulation
npm i -D timekeeper @types/timekeeper

# Network request mocking
npm i -D nock @types/nock
```

### Test Structure

Your application follows the standard AdonisJS testing structure:

```
tests/
├── bootstrap.ts          # Test configuration
├── unit/                 # Unit tests (isolated logic)
│   └── **/*.spec.ts
└── functional/           # Integration/API tests
    └── **/*.spec.ts
```

## Environment Configuration

### 1. Create Test Environment File

Create `.env.test` in your project root:

```bash
# Database configuration for testing
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=blueskybluesky
DB_PASSWORD=blueskybluesky
DB_DATABASE=blueskybluesky_test

# Redis configuration for testing
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Session driver must be memory for tests
SESSION_DRIVER=memory

# Disable external services during testing
FIREHOSE_ENABLED=false
PYTHON_WORKERS_ENABLED=false

# Test-specific settings
NODE_ENV=test
PORT=3334
HOST=localhost

# API keys (use test keys if available)
OPENAI_API_KEY=test_key_or_real_key
ANTHROPIC_API_KEY=test_key_or_real_key

# Queue settings for testing
BULL_REDIS_HOST=127.0.0.1
BULL_REDIS_PORT=6379
```

### 2. Update Bootstrap Configuration

Update `tests/bootstrap.ts` to include necessary plugins:

```typescript
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'

export const plugins: Config['plugins'] = [
  assert(),
  apiClient({
    baseURL: `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3334}`
  }),
  pluginAdonisJS(app)
]

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [
    // Run migrations before all tests
    () => testUtils.db().migrate(),
    // Optionally seed the database
    // () => testUtils.db().seed(),
  ],
  teardown: [
    // Clean up after all tests
    () => testUtils.db().truncate(),
  ],
}

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

## Database Testing

### Database Strategies

Choose one of these strategies based on your needs:

#### 1. Global Transactions (Recommended for most cases)

Use for tests that don't use transactions in the application code:

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('User Management', (group) => {
  // Clean database state between each test
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create a user', async ({ assert }) => {
    // Test implementation
  })
})
```

#### 2. Table Truncation

Use when your application code uses transactions:

```typescript
test.group('Bulk Analysis', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  
  test('should queue bulk analysis', async ({ assert }) => {
    // Test implementation
  })
})
```

#### 3. Fresh Migration Per Test (Slower but thorough)

```typescript
test.group('Schema Changes', (group) => {
  group.each.setup(() => testUtils.db().migrate())
  
  test('should handle schema evolution', async ({ assert }) => {
    // Test implementation
  })
})
```

### Creating Test Data with Factories

Instead of raw SQL, use Lucid models and factories:

```typescript
// tests/unit/ai_scheduler_service.spec.ts
import { test } from '@japa/runner'
import User from '#models/user'
import AudienceAnalysis from '#models/audience_analysis'
import AiSchedulerService from '#services/ai_scheduler_service'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('AiSchedulerService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should add account to recurring analysis queue', async ({ assert }) => {
    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    })

    const scheduler = new AiSchedulerService()
    
    // Test the renamed method
    await scheduler.addAccountToRecurringAnalysisQueue('testuser.bsky.social', {
      priority: 5,
      lastAnalysis: new Date()
    })

    // Verify queue state
    const accounts = await scheduler.getHighestPriorityRecurringAccounts(1)
    assert.lengthOf(accounts, 1)
    assert.equal(accounts[0].handle, 'testuser.bsky.social')
  })

  test('should add bulk analysis to queue', async ({ assert }) => {
    // Create test data
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    })

    const analysis = await AudienceAnalysis.create({
      userId: user.id,
      accountHandle: 'testuser.bsky.social',
      status: 'pending',
      requestedAt: new Date()
    })

    const scheduler = new AiSchedulerService()
    
    // Test the renamed method
    await scheduler.addBulkAnalysisToQueue(analysis.id, 'testuser.bsky.social')

    // Verify queue state
    const job = await scheduler.getNextBulkAnalysisJob()
    assert.isNotNull(job)
    assert.equal(job.accountHandle, 'testuser.bsky.social')
  })
})
```

## HTTP/API Testing

### Basic API Testing

```typescript
// tests/functional/analysis_controller.spec.ts
import { test } from '@japa/runner'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Analysis Controller', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create audience analysis request', async ({ client, assert }) => {
    // Create authenticated user
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    })

    const response = await client
      .post('/api/analysis')
      .json({
        accountHandle: 'testuser.bsky.social',
        analysisType: 'audience'
      })
      .loginAs(user) // If using authentication

    response.assertStatus(201)
    response.assertBodyContains({
      success: true,
      data: {
        accountHandle: 'testuser.bsky.social'
      }
    })

    // Verify database state
    const analyses = await user.related('audienceAnalyses').query()
    assert.lengthOf(analyses, 1)
    assert.equal(analyses[0].accountHandle, 'testuser.bsky.social')
  })

  test('should handle validation errors', async ({ client }) => {
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    })

    const response = await client
      .post('/api/analysis')
      .json({
        // Missing required fields
      })
      .loginAs(user)

    response.assertStatus(422)
    response.assertHasValidationError('accountHandle')
  })
})
```

### Testing Queue Operations

```typescript
// tests/functional/queue_controller.spec.ts
import { test } from '@japa/runner'
import User from '#models/user'
import AiSchedulerService from '#services/ai_scheduler_service'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Queue Controller', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should get queue status', async ({ client, assert }) => {
    const user = await User.create({
      email: 'admin@example.com',
      username: 'admin',
      password: 'password123',
      role: 'admin'
    })

    // Add some test data to queues
    const scheduler = new AiSchedulerService()
    await scheduler.addAccountToRecurringAnalysisQueue('test1.bsky.social', {
      priority: 5,
      lastAnalysis: new Date()
    })
    await scheduler.addAccountToRecurringAnalysisQueue('test2.bsky.social', {
      priority: 3,
      lastAnalysis: new Date()
    })

    const response = await client
      .get('/api/admin/queue-status')
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      recurringAnalysisQueue: {
        length: 2
      }
    })
  })
})
```

## Testing Best Practices

### 1. Mocking External Services

Mock external API calls and services:

```typescript
import { test } from '@japa/runner'
import nock from 'nock'
import OpenAIService from '#services/openai_service'

test.group('OpenAI Service', (group) => {
  group.teardown(() => {
    nock.cleanAll()
  })

  test('should analyze text with OpenAI', async ({ assert }) => {
    // Mock OpenAI API response
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'positive',
            keywords: ['technology', 'innovation']
          })
        }
      }]
    }

    nock('https://api.openai.com')
      .post('/v1/chat/completions')
      .reply(200, mockResponse)

    const service = new OpenAIService()
    const result = await service.analyzeText('This is a test post about technology')

    assert.equal(result.sentiment, 'positive')
    assert.include(result.keywords, 'technology')
  })
})
```

### 2. Testing Redis/Queue Operations

```typescript
import { test } from '@japa/runner'
import Redis from '@ioc:Adonis/Addons/Redis'
import AiSchedulerService from '#services/ai_scheduler_service'

test.group('Redis Queue Operations', (group) => {
  group.each.teardown(async () => {
    // Clean up Redis keys after each test
    await Redis.flushdb()
  })

  test('should manage recurring analysis queue', async ({ assert }) => {
    const scheduler = new AiSchedulerService()
    
    await scheduler.addAccountToRecurringAnalysisQueue('test.bsky.social', {
      priority: 5,
      lastAnalysis: new Date()
    })

    const queueLength = await Redis.zcard(scheduler['RECURRING_ANALYSIS_QUEUE'])
    assert.equal(queueLength, 1)

    const accounts = await scheduler.getHighestPriorityRecurringAccounts(1)
    assert.lengthOf(accounts, 1)
    assert.equal(accounts[0].handle, 'test.bsky.social')
  })
})
```

### 3. Testing Error Handling

```typescript
test('should handle database errors gracefully', async ({ client, assert }) => {
  // Simulate database error by providing invalid data
  const response = await client
    .post('/api/analysis')
    .json({
      accountHandle: 'a'.repeat(300), // Exceeds database field limit
      analysisType: 'audience'
    })

  response.assertStatus(500)
  response.assertBodyContains({
    success: false,
    message: 'Une erreur est survenue'
  })
})
```

## Replacing create_test_data.mjs

Instead of the independent PostgreSQL script, create AdonisJS commands and seeders:

### 1. Create a Test Data Command

```bash
node ace make:command CreateTestData
```

```typescript
// app/commands/create_test_data.ts
import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import AudienceAnalysis from '#models/audience_analysis'
import AiSchedulerService from '#services/ai_scheduler_service'

export default class CreateTestData extends BaseCommand {
  static commandName = 'test:data'
  static description = 'Create test data for development and testing'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: false,
  }

  async run() {
    this.logger.info('Creating test data...')

    try {
      // Create test users
      const testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      })

      const adminUser = await User.create({
        email: 'admin@example.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      })

      // Create test audience analyses
      await AudienceAnalysis.create({
        userId: testUser.id,
        accountHandle: 'testuser.bsky.social',
        status: 'pending',
        requestedAt: new Date()
      })

      await AudienceAnalysis.create({
        userId: testUser.id,
        accountHandle: 'another.bsky.social',
        status: 'completed',
        requestedAt: new Date(Date.now() - 86400000), // 24 hours ago
        completedAt: new Date()
      })

      // Add accounts to recurring analysis queue
      const scheduler = new AiSchedulerService()
      await scheduler.addAccountToRecurringAnalysisQueue('popular.bsky.social', {
        priority: 10,
        lastAnalysis: new Date(Date.now() - 3600000) // 1 hour ago
      })

      await scheduler.addAccountToRecurringAnalysisQueue('trending.bsky.social', {
        priority: 8,
        lastAnalysis: new Date(Date.now() - 7200000) // 2 hours ago
      })

      this.logger.success('Test data created successfully!')
      this.logger.info(`Created users: ${testUser.email}, ${adminUser.email}`)
      this.logger.info('Created sample audience analyses')
      this.logger.info('Added accounts to recurring analysis queue')

    } catch (error) {
      this.logger.error('Failed to create test data:', error)
      process.exit(1)
    }
  }
}
```

### 2. Create Database Seeders

```bash
node ace make:seeder TestData
```

```typescript
// database/seeders/test_data_seeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import AudienceAnalysis from '#models/audience_analysis'

export default class extends BaseSeeder {
  async run() {
    // Create test users
    const users = await User.createMany([
      {
        email: 'test1@example.com',
        username: 'testuser1',
        password: 'password123'
      },
      {
        email: 'test2@example.com',
        username: 'testuser2',
        password: 'password123'
      },
      {
        email: 'admin@example.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      }
    ])

    // Create test analyses
    await AudienceAnalysis.createMany([
      {
        userId: users[0].id,
        accountHandle: 'testuser1.bsky.social',
        status: 'completed',
        requestedAt: new Date(Date.now() - 86400000),
        completedAt: new Date(Date.now() - 82800000)
      },
      {
        userId: users[1].id,
        accountHandle: 'testuser2.bsky.social',
        status: 'pending',
        requestedAt: new Date()
      }
    ])
  }
}
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test
# or
node ace test

# Run specific test suite
node ace test unit
node ace test functional

# Run with watch mode
node ace test --watch

# Run specific test file
node ace test --files=user

# Run tests with specific tags
node ace test --tags=@slow

# Force exit after tests
node ace test --force-exit

# Run with coverage (if configured)
node ace test --coverage
```

### Test Environment Setup

```bash
# Create test database
createdb blueskybluesky_test

# Run migrations for test database
DB_DATABASE=blueskybluesky_test node ace migration:run

# Seed test database
DB_DATABASE=blueskybluesky_test node ace db:seed

# Or use the custom command
node ace test:data
```

### Continuous Integration

For CI/CD pipelines, add these scripts to `package.json`:

```json
{
  "scripts": {
    "test:ci": "node ace test --force-exit",
    "test:setup": "node ace migration:run && node ace db:seed",
    "test:teardown": "node ace migration:rollback --batch=0"
  }
}
```

## Debugging Tests

### Using Debug Mode

```bash
# Run with debug output
DEBUG=* node ace test

# Run with specific debug namespace
DEBUG=app:* node ace test

# Use Node.js debugger
node --inspect-brk ace test
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/ace",
      "args": ["test", "--force-exit"],
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Common Debugging Patterns

```typescript
test('debug example', async ({ assert }) => {
  // Use console.log for quick debugging
  console.log('Current user:', user)

  // Use assert.plan for ensuring all assertions run
  assert.plan(2)

  // Add timeouts for async operations
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Verify state at different points
  const beforeState = await SomeModel.all()
  console.log('Before:', beforeState.length)

  // Your test logic here

  const afterState = await SomeModel.all()
  console.log('After:', afterState.length)
})
```

## Migration from create_test_data.mjs

To fully replace the independent PostgreSQL script:

1. **Delete** `create_test_data.mjs`
2. **Use** the AdonisJS command: `node ace test:data`
3. **Update** any documentation references
4. **Create** seeders for different test scenarios
5. **Use** the testing database configuration in `.env.test`

This approach provides better integration with your AdonisJS application, proper error handling, and maintainable test data creation that works with your application's models and services.
