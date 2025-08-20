export interface PromoCode {
  code: string
  discount: number // Pourcentage de réduction (ex: 50 pour 50%)
  type: 'percentage' | 'fixed' // Type de réduction
  validUntil?: Date
  maxUses?: number
  currentUses: number
  active: boolean
  plans?: string[] // Plans auxquels le code s'applique
}

export class PromoCodeService {
  // Codes de réduction prédéfinis pour les tests
  private static readonly PROMO_CODES: Record<string, PromoCode> = {
    'TEST50': {
      code: 'TEST50',
      discount: 100,
      type: 'percentage',
      validUntil: new Date('2025-12-31'),
      maxUses: 100,
      currentUses: 0,
      active: true,
      plans: ['pro', 'business']
    },
    'LAUNCH100': {
      code: 'LAUNCH100',
      discount: 100,
      type: 'percentage',
      validUntil: new Date('2025-09-30'),
      maxUses: 50,
      currentUses: 0,
      active: true,
      plans: ['pro']
    },
    'BUSINESS20': {
      code: 'BUSINESS20',
      discount: 20,
      type: 'percentage',
      validUntil: new Date('2025-12-31'),
      maxUses: 200,
      currentUses: 0,
      active: true,
      plans: ['business']
    },
    'EARLYBIRD': {
      code: 'EARLYBIRD',
      discount: 75,
      type: 'percentage',
      validUntil: new Date('2025-10-31'),
      maxUses: 25,
      currentUses: 0,
      active: true,
      plans: ['pro', 'business']
    }
  }

  /**
   * Valide un code promo
   */
  static validatePromoCode(code: string, plan: string): {
    valid: boolean
    promoCode?: PromoCode
    error?: string
  } {
    const promoCode = this.PROMO_CODES[code.toUpperCase()]
    
    if (!promoCode) {
      return { valid: false, error: 'Code promo invalide' }
    }

    if (!promoCode.active) {
      return { valid: false, error: 'Code promo désactivé' }
    }

    if (promoCode.validUntil && new Date() > promoCode.validUntil) {
      return { valid: false, error: 'Code promo expiré' }
    }

    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return { valid: false, error: 'Code promo épuisé' }
    }

    if (promoCode.plans && !promoCode.plans.includes(plan)) {
      return { valid: false, error: 'Code promo non applicable à ce plan' }
    }

    return { valid: true, promoCode }
  }

  /**
   * Calcule le prix avec réduction
   */
  static calculateDiscountedPrice(originalPrice: number, promoCode: PromoCode): number {
    if (promoCode.type === 'percentage') {
      return Math.max(0, originalPrice * (1 - promoCode.discount / 100))
    } else {
      return Math.max(0, originalPrice - promoCode.discount)
    }
  }

  /**
   * Marque un code comme utilisé
   */
  static markAsUsed(code: string): void {
    const promoCode = this.PROMO_CODES[code.toUpperCase()]
    if (promoCode) {
      promoCode.currentUses++
    }
  }

  /**
   * Obtient tous les codes actifs (pour admin)
   */
  static getAllActiveCodes(): PromoCode[] {
    return Object.values(this.PROMO_CODES).filter(code => code.active)
  }

  /**
   * Crée un coupon Stripe pour le code promo
   */
  static createStripeCouponData(promoCode: PromoCode) {
    const baseData = {
      duration: 'once' as const, // Appliqué une seule fois
      max_redemptions: promoCode.maxUses,
      redeem_by: promoCode.validUntil ? Math.floor(promoCode.validUntil.getTime() / 1000) : undefined,
      name: `Promo Code: ${promoCode.code}`
    }

    if (promoCode.type === 'percentage') {
      return {
        ...baseData,
        percent_off: Math.min(100, Math.max(1, promoCode.discount)) // Entre 1 et 100
      }
    } else {
      return {
        ...baseData,
        amount_off: Math.round(promoCode.discount * 100), // Stripe utilise les centimes
        currency: 'eur' as const
      }
    }
  }
}
