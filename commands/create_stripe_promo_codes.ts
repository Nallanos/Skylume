import { BaseCommand } from '@adonisjs/core/ace'
import { Stripe } from 'stripe'

export default class CreateStripePromoCodes extends BaseCommand {
  static commandName = 'stripe:create-promo-codes'
  static description = 'Create promotion codes in Stripe dashboard'

  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  async run() {
    this.logger.info('🚀 Creating Stripe promotion codes...')

    const promoCodes = [
      {
        id: 'test50_coupon',
        code: 'TEST50',
        percent_off: 100,
        duration: 'once',
        max_redemptions: 100,
        redeem_by: Math.floor(new Date('2025-12-31').getTime() / 1000),
        name: 'TEST50 - Gratuit'
      },
      {
        id: 'launch100_coupon',
        code: 'LAUNCH100', 
        percent_off: 100,
        duration: 'once',
        max_redemptions: 50,
        redeem_by: Math.floor(new Date('2025-09-30').getTime() / 1000),
        name: 'LAUNCH100 - Gratuit Pro'
      },
      {
        id: 'business20_coupon',
        code: 'BUSINESS20',
        percent_off: 20,
        duration: 'once',
        max_redemptions: 200,
        redeem_by: Math.floor(new Date('2025-12-31').getTime() / 1000),
        name: 'BUSINESS20 - 20% Off'
      },
      {
        id: 'earlybird_coupon',
        code: 'EARLYBIRD',
        percent_off: 75,
        duration: 'once',
        max_redemptions: 25,
        redeem_by: Math.floor(new Date('2025-10-31').getTime() / 1000),
        name: 'EARLYBIRD - 75% Off'
      }
    ]

    for (const promoData of promoCodes) {
      try {
        // 1. Créer le coupon
        this.logger.info(`Creating coupon: ${promoData.id}`)
        
        const couponData = {
          id: promoData.id,
          percent_off: promoData.percent_off,
          duration: promoData.duration as 'once',
          max_redemptions: promoData.max_redemptions,
          redeem_by: promoData.redeem_by,
          name: promoData.name
        }

        let coupon
        try {
          coupon = await this.stripe.coupons.create(couponData)
          this.logger.success(`✅ Coupon created: ${coupon.id}`)
        } catch (error: any) {
          if (error.code === 'resource_already_exists') {
            this.logger.info(`⚠️  Coupon ${promoData.id} already exists, retrieving...`)
            coupon = await this.stripe.coupons.retrieve(promoData.id)
          } else {
            throw error
          }
        }

        // 2. Créer le promotion code
        this.logger.info(`Creating promotion code: ${promoData.code}`)
        
        try {
          const promotionCode = await this.stripe.promotionCodes.create({
            coupon: coupon.id,
            code: promoData.code,
            active: true,
            max_redemptions: promoData.max_redemptions
          })
          this.logger.success(`✅ Promotion code created: ${promotionCode.code}`)
        } catch (error: any) {
          if (error.code === 'resource_already_exists') {
            this.logger.info(`⚠️  Promotion code ${promoData.code} already exists`)
          } else {
            throw error
          }
        }

      } catch (error: any) {
        this.logger.error(`❌ Error for ${promoData.code}:`, error.message)
      }
    }

    this.logger.success('🎉 All promotion codes processed!')
    this.logger.info('You can now use TEST50, LAUNCH100, BUSINESS20, EARLYBIRD in Stripe checkout')
  }
}
