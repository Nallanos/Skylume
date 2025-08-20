#!/usr/bin/env node

/**
 * Test script pour vérifier les fonctionnalités d'annulation d'abonnement
 */

import { BaseCommand } from '@adonisjs/core/ace'

export default class TestSubscriptionCancellation extends BaseCommand {
  static commandName = 'test:subscription-cancellation'
  static description = 'Test subscription cancellation functionality'

  async run() {
    const { default: User } = await import('#models/user')
    
    try {
      // Chercher un utilisateur avec un abonnement actif
      const userWithSubscription = await User.query()
        .whereNotNull('subscriptions_id')
        .where('plan', '!=', 'free')
        .first()

      if (!userWithSubscription) {
        this.logger.info('❌ No user with active subscription found')
        this.logger.info('💡 Create a test user with subscription first')
        return
      }

      this.logger.info(`✅ Found user with subscription:`)
      this.logger.info(`   - User ID: ${userWithSubscription.id}`)
      this.logger.info(`   - Plan: ${userWithSubscription.plan}`)
      this.logger.info(`   - Subscription ID: ${userWithSubscription.subscriptionsId}`)
      
      // Vérifier les routes d'annulation
      this.logger.info('\n📋 Available subscription management routes:')
      this.logger.info('   - POST /cancel-subscription (cancel from profile)')
      this.logger.info('   - POST /customer-portal (Stripe customer portal)')
      this.logger.info('   - DELETE /delete (cancel subscription on account deletion)')

      this.logger.info('\n🧪 To test:')
      this.logger.info('1. Go to /profile and click "Cancel Subscription"')
      this.logger.info('2. Try deleting account to test automatic cancellation')
      this.logger.info('3. Use "Manage Subscription" to access Stripe portal')

    } catch (error) {
      this.logger.error('❌ Error testing subscription cancellation:', error.message)
    }
  }
}
