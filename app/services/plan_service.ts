export interface PlanLimits {
  maxScheduledPosts: number // -1 = illimité
  maxAccounts: number
  maxFeeds: number
  followerLoadingsPerMonth: number
  dailyFollowActions: number
  dmCampaigns: boolean
  dmCampaignExecution: boolean
}

export interface PlanFeatures {
  name: string
  price: number
  limits: PlanLimits
  stripeProductId?: string
}

export class PlanService {
  static readonly PLANS: Record<string, PlanFeatures> = {
    free: {
      name: 'Freemium',
      price: 0,
      limits: {
        maxScheduledPosts: 7,
        maxAccounts: 2,
        maxFeeds: 2,
        followerLoadingsPerMonth: 5,
        dailyFollowActions: 200,
        dmCampaigns: false,
        dmCampaignExecution: false
      }
    },
    pro: {
      name: 'Pro',
      price: 10,
      limits: {
        maxScheduledPosts: -1, // Illimité
        maxAccounts: -1,
        maxFeeds: -1,
        followerLoadingsPerMonth: -1,
        dailyFollowActions: -1,
        dmCampaigns: true,
        dmCampaignExecution: false
      },
      stripeProductId: process.env.STRIPE_PRICE_ID // Utilise STRIPE_PRICE_ID pour Pro
    },
    business: {
      name: 'Business',
      price: 19,
      limits: {
        maxScheduledPosts: -1,
        maxAccounts: -1,
        maxFeeds: -1,
        followerLoadingsPerMonth: -1,
        dailyFollowActions: -1,
        dmCampaigns: true,
        dmCampaignExecution: true
      },
      stripeProductId: process.env.STRIPE_PRICE_ID_BUSINESS
    }
  }

  /**
   * Obtient les limites pour un plan donné
   */
  static getLimitsForPlan(planName: string): PlanLimits {
    const plan = this.PLANS[planName] || this.PLANS.free
    return plan.limits
  }

  /**
   * Vérifie si une limite est atteinte
   */
  static isLimitReached(current: number, limit: number): boolean {
    if (limit === -1) return false // Illimité
    return current >= limit
  }

  /**
   * Obtient le plan recommandé pour débloquer une fonctionnalité
   */
  static getRecommendedPlanForFeature(feature: keyof PlanLimits): string {
    if (this.PLANS.pro.limits[feature] !== false && 
        (typeof this.PLANS.pro.limits[feature] === 'number' ? 
         this.PLANS.pro.limits[feature] === -1 : 
         this.PLANS.pro.limits[feature])) {
      return 'pro'
    }
    return 'business'
  }

  /**
   * Vérifie si un utilisateur peut accéder à une fonctionnalité
   */
  static canAccessFeature(userPlan: string, feature: keyof PlanLimits): boolean {
    const limits = this.getLimitsForPlan(userPlan)
    const featureValue = limits[feature]
    
    if (typeof featureValue === 'boolean') {
      return featureValue
    }
    
    return featureValue === -1 || featureValue > 0
  }

  /**
   * Calcule le pourcentage d'utilisation d'une limite
   */
  static getUsagePercentage(current: number, limit: number): number {
    if (limit === -1) return 0 // Illimité
    if (limit === 0) return 100
    return Math.min(100, (current / limit) * 100)
  }

  /**
   * Détermine si l'utilisateur approche d'une limite (80% ou plus)
   */
  static isApproachingLimit(current: number, limit: number): boolean {
    return this.getUsagePercentage(current, limit) >= 80
  }

  /**
   * Obtient toutes les informations sur un plan
   */
  static getPlanInfo(planName: string): PlanFeatures {
    return this.PLANS[planName] || this.PLANS.free
  }

  /**
   * Liste tous les plans disponibles
   */
  static getAllPlans(): Record<string, PlanFeatures> {
    return this.PLANS
  }
}
