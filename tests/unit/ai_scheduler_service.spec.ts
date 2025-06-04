import { test } from '@japa/runner'
import redis from '@adonisjs/redis/services/main'
import { AiSchedulerService } from '#services/ai_scheduler_service'

test.group('AI Scheduler Service', (group) => {
  let aiSchedulerService: AiSchedulerService

  group.setup(() => {
    aiSchedulerService = new AiSchedulerService()
  })

  group.teardown(async () => {
    // Clean up test data from Redis
    const keys = await redis.keys('analysis:*test*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('should add account to recurring analysis queue', async ({ assert }) => {
    const hashId = 'test-account-123'
    const priority = 100
    const accountInfo = {
      followersCount: 5000,
      accountHandle: 'testuser.bsky.social',
      metadata: { lastAnalysis: '2024-01-01' }
    }

    await aiSchedulerService.addAccountToRecurringAnalysisQueue(hashId, priority, accountInfo)

    // Verify account was added to sorted set
    const score = await redis.zscore('analysis:priorityQueue', hashId)
    assert.equal(score, priority.toString())

    // Verify account info was stored in hash
    const storedInfo = await aiSchedulerService.getAccountInfo(hashId)
    assert.isNotNull(storedInfo)
    assert.equal(storedInfo!.hashId, hashId)
    assert.equal(storedInfo!.followersCount, 5000)
    assert.equal(storedInfo!.accountHandle, 'testuser.bsky.social')
    assert.deepEqual(storedInfo!.metadata, { lastAnalysis: '2024-01-01' })
  }).timeout(30000) // 30 second timeout to handle slow Redis operations

  test('should get account info from Redis', async ({ assert }) => {
    const hashId = 'test-account-456'
    const accountInfo = {
      followersCount: 3000,
      accountHandle: 'another.bsky.social',
      metadata: { type: 'premium' }
    }

    await aiSchedulerService.addAccountToRecurringAnalysisQueue(hashId, 75, accountInfo)

    const retrievedInfo = await aiSchedulerService.getAccountInfo(hashId)

    assert.isNotNull(retrievedInfo)
    assert.equal(retrievedInfo!.followersCount, 3000)
    assert.equal(retrievedInfo!.accountHandle, 'another.bsky.social')
    assert.deepEqual(retrievedInfo!.metadata, { type: 'premium' })
    assert.exists(retrievedInfo!.lastUpdated)
  }).timeout(10000) // 10 second timeout

  test('should return null for non-existent account', async ({ assert }) => {
    const retrievedInfo = await aiSchedulerService.getAccountInfo('non-existent-account')
    assert.isNull(retrievedInfo)
  })

  test('should get highest priority recurring accounts', async ({ assert }) => {
    // Add multiple accounts with different priorities
    const accounts = [
      { hashId: 'test-high-priority', priority: 200 },
      { hashId: 'test-medium-priority', priority: 100 },
      { hashId: 'test-low-priority', priority: 50 }
    ]

    for (const account of accounts) {
      await aiSchedulerService.addAccountToRecurringAnalysisQueue(
        account.hashId,
        account.priority,
        {
          followersCount: 1000,
          accountHandle: `${account.hashId}.bsky.social`
        }
      )
    }

    // Get top 2 highest priority accounts
    const highestPriority = await aiSchedulerService.getHighestPriorityRecurringAccounts(2)

    assert.equal(highestPriority.length, 2)
    assert.equal(highestPriority[0], 'test-high-priority')
    assert.equal(highestPriority[1], 'test-medium-priority')
  }).timeout(15000) // Increased timeout

  test('should update account priority', async ({ assert }) => {
    const hashId = 'test-priority-update'
    const initialPriority = 100
    const newPriority = 150

    // Add account with initial priority
    await aiSchedulerService.addAccountToRecurringAnalysisQueue(
      hashId,
      initialPriority,
      {
        followersCount: 2000,
        accountHandle: 'priority-test.bsky.social'
      }
    )

    // Update priority
    await aiSchedulerService.updateRecurringAccountPriority(hashId, newPriority)

    // Verify priority was updated
    const score = await redis.zscore('analysis:priorityQueue', hashId)
    assert.equal(score, newPriority.toString())
  }).timeout(10000)

  test('should update account info', async ({ assert }) => {
    const hashId = 'test-info-update'

    // Add account with initial info
    await aiSchedulerService.addAccountToRecurringAnalysisQueue(
      hashId,
      100,
      {
        followersCount: 1000,
        accountHandle: 'old-handle.bsky.social',
        metadata: { status: 'new' }
      }
    )

    // Update account info
    await aiSchedulerService.updateRecurringAccountInfo(hashId, {
      followersCount: 2000,
      accountHandle: 'new-handle.bsky.social',
      metadata: { status: 'updated', lastSeen: '2024-01-15' }
    })

    // Verify updates
    const updatedInfo = await aiSchedulerService.getAccountInfo(hashId)

    assert.isNotNull(updatedInfo)
    assert.equal(updatedInfo!.followersCount, 2000)
    assert.equal(updatedInfo!.accountHandle, 'new-handle.bsky.social')
    assert.deepEqual(updatedInfo!.metadata, { status: 'updated', lastSeen: '2024-01-15' })
  })

  test('should handle malformed metadata gracefully', async ({ assert }) => {
    const hashId = 'test-malformed-metadata'

    // Manually insert account with malformed metadata
    const hashKey = `analysis:info:${hashId}`
    await redis.hset(hashKey, {
      hashId,
      followersCount: '1000',
      accountHandle: 'test.bsky.social',
      lastUpdated: new Date().toISOString(),
      metadata: 'invalid-json-string'
    })

    // Should handle gracefully and return empty metadata
    const accountInfo = await aiSchedulerService.getAccountInfo(hashId)

    assert.isNotNull(accountInfo)
    assert.deepEqual(accountInfo!.metadata, {})
  })

  test('should handle empty account data', async ({ assert }) => {
    const hashId = 'test-empty-account'

    // Create empty hash
    const hashKey = `analysis:info:${hashId}`
    await redis.hset(hashKey, 'dummy', 'value')
    await redis.hdel(hashKey, 'dummy')

    const accountInfo = await aiSchedulerService.getAccountInfo(hashId)
    assert.isNull(accountInfo)
  })

  test('should get correct count of highest priority accounts', async ({ assert }) => {
    // Use a unique prefix for this test and clear any existing data first
    const testPrefix = 'count-test-'

    // Clear any existing test data
    const existingKeys = await redis.keys(`analysis:info:${testPrefix}*`)
    if (existingKeys.length > 0) {
      await redis.del(...existingKeys)
    }

    // Clear the entire queue to ensure test isolation
    await redis.del('analysis:priorityQueue')

    // Add 5 accounts with high priorities to ensure they're at the top
    for (let i = 1; i <= 5; i++) {
      await aiSchedulerService.addAccountToRecurringAnalysisQueue(
        `${testPrefix}${i}`,
        1000 + (i * 10), // Use high priorities (1010, 1020, 1030, 1040, 1050)
        {
          followersCount: i * 1000,
          accountHandle: `test${i}.bsky.social`
        }
      )
    }

    // Request all accounts to see what we get
    const allAccounts = await aiSchedulerService.getHighestPriorityRecurringAccounts(10)
    console.log('All accounts in queue:', allAccounts)

    // Filter to only our test accounts
    const ourTestAccounts = allAccounts.filter(account => account.startsWith(testPrefix))
    console.log('Our test accounts:', ourTestAccounts)

    // Request 5 accounts to ensure we get all our test accounts
    const accounts = await aiSchedulerService.getHighestPriorityRecurringAccounts(5)
    const filteredAccounts = accounts.filter(account => account.startsWith(testPrefix))

    assert.equal(filteredAccounts.length, 5, `Should have exactly 5 test accounts. All accounts: ${allAccounts.join(', ')}, Our accounts: ${ourTestAccounts.join(', ')}`)

    // Check that they are in correct priority order (highest to lowest)
    assert.equal(filteredAccounts[0], `${testPrefix}5`) // priority 1050
    assert.equal(filteredAccounts[1], `${testPrefix}4`) // priority 1040
    assert.equal(filteredAccounts[2], `${testPrefix}3`) // priority 1030
  }).timeout(15000)

  test('should handle empty priority queue', async ({ assert }) => {
    // Clear the queue first
    await redis.del('analysis:priorityQueue')

    const accounts = await aiSchedulerService.getHighestPriorityRecurringAccounts(5)

    assert.equal(accounts.length, 0)
  })
})
