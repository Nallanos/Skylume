// Test Data Factory - Placeholder to resolve import errors
export class TestDataFactory {
  static async createUser() {
    return {
      id: 1,
      email: 'test@example.com'
    }
  }

  static async createTestUser() {
    return this.createUser()
  }

  static async createAccount() {
    return {
      id: 'test-account',
      handle: 'test.bsky.social'
    }
  }

  static async createTestAccount(userId?: string | number) {
    return {
      ...await this.createAccount(),
      userId
    }
  }

  static async createAnalysis() {
    return {
      id: 1,
      userId: 1,
      accountId: 'test-account'
    }
  }

  static async createTestAnalysis(accountId?: string | number) {
    return {
      ...await this.createAnalysis(),
      accountId
    }
  }

  static async createTestData() {
    const user = await this.createUser()
    const account = await this.createAccount()
    const analysis = await this.createAnalysis()

    return {
      user,
      account,
      analysis,
      userId: user.id,
      accountId: account.id,
      analysisId: analysis.id
    }
  }

  static async createCompleteTestData() {
    return this.createTestData()
  }

  static async cleanup() {
    // Placeholder cleanup method
    console.log('Test cleanup completed')
  }
}
