import { test } from '@japa/runner'
import OAuthService from '#services/oauth_service'
import redis from '@adonisjs/redis/services/main'

test.group('OAuth Service', (group) => {
  let oauthService: OAuthService

  group.setup(async () => {
    oauthService = new OAuthService()
  })

  group.teardown(async () => {
    // Clean up any test data in Redis
    const testKeys = await redis.keys('oauth_test:*')
    if (testKeys.length > 0) {
      await redis.del(...testKeys)
    }
  })

  test('should generate valid PKCE challenge', async ({ expect }) => {
    const { codeVerifier, codeChallenge } = await oauthService.generatePKCEChallenge()
    
    expect(codeVerifier).toBeDefined()
    expect(codeChallenge).toBeDefined()
    expect(typeof codeVerifier).toBe('string')
    expect(typeof codeChallenge).toBe('string')
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43) // RFC 7636 minimum length
  })

  test('should create OAuth authorization URL', async ({ expect }) => {
    const userId = 'test-user-123'
    const authUrl = await oauthService.initiateAuthFlow(userId)
    
    expect(typeof authUrl).toBe('string')
    expect(authUrl).toMatch(/^https:\/\//)
    expect(authUrl).toContain('client_id=')
    expect(authUrl).toContain('redirect_uri=')
    expect(authUrl).toContain('code_challenge=')
    expect(authUrl).toContain('code_challenge_method=S256')
    expect(authUrl).toContain('state=')
  })

  test('should validate environment configuration', async ({ expect }) => {
    // Test that our OAuth service can read environment variables
    const authUrl = await oauthService.initiateAuthFlow('test-user')
    
    // Should not throw an error and should return a valid URL
    expect(typeof authUrl).toBe('string')
    expect(authUrl.length).toBeGreaterThan(0)
  })
})

test.group('OAuth Integration', () => {
  test('should handle OAuth callback validation', async ({ expect }) => {
    const oauthService = new OAuthService()
    
    // Test invalid callback parameters
    try {
      await oauthService.handleCallback('invalid-code', 'invalid-state', 'test-user')
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error.message).toMatch(/Invalid|expired|not found/)
    }
  })
})
