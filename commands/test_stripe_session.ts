import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import axios from 'axios'
import User from '#models/user'

export default class TestStripeSession extends BaseCommand {
  static commandName = 'test:stripe-session'
  static description = 'Test Stripe session creation with authenticated user'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Vérifier qu'un utilisateur de test existe
    const testUser = await User.find('allanbe.bsky.social')
    if (!testUser) {
      this.logger.error('❌ Test user allanbe.bsky.social not found')
      this.logger.info('Please create a test user first')
      return
    }

    this.logger.info(`✅ Found test user: ${testUser.id} (plan: ${testUser.plan})`)
    
    // Simuler une création de session (nécessiterait une vraie authentification)
    this.logger.info('\n🔗 To test session creation manually:')
    this.logger.info('1. Start the server: npm run dev')
    this.logger.info('2. Login at: http://localhost:8081/login')
    this.logger.info('   - Handle: allanbe.bsky.social')
    this.logger.info('   - Password: (use the real password)')
    this.logger.info('3. Go to: http://localhost:8081/stripe/checkout/pro')
    this.logger.info('4. Check server logs for session metadata')
    
    this.logger.info('\n📝 What to look for in logs:')
    this.logger.info('   - [STRIPE] Authenticated user: allanbe.bsky.social')
    this.logger.info('   - [STRIPE] Session metadata: {"plan":"pro","user_id":"allanbe.bsky.social"}')
    this.logger.info('   - [STRIPE] Session metadata confirmed: (from Stripe response)')
  }
}
