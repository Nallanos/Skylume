import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class TestUserCreation extends BaseCommand {
  static commandName = 'test:user-creation'
  static description = 'Test user creation with null email'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const testHandle = 'test.null.email.bsky.social'
    
    try {
      // Check if user already exists
      let user = await User.find(testHandle)
      
      if (user) {
        this.logger.info(`✅ User ${testHandle} already exists`)
        this.logger.info(`   Email: ${user.email || 'NULL ✅'}`)
        this.logger.info(`   Plan: ${user.plan}`)
        return
      }

      // Create test user with null email
      user = await User.create({
        id: testHandle,
        email: null, // This should work now
        password: 'test123',
        plan: 'free'
      })

      this.logger.info(`✅ Created test user: ${testHandle}`)
      this.logger.info(`   Email: ${user.email || 'NULL ✅'}`)
      this.logger.info(`   Plan: ${user.plan}`)
      
      // Test authentication by ID
      const foundUser = await User.find(testHandle)
      if (foundUser) {
        this.logger.info(`✅ User can be found by ID: ${foundUser.id}`)
      }

    } catch (error) {
      this.logger.error('❌ Error testing user creation:', error)
    }
  }
}
