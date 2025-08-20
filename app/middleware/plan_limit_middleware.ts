import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { PlanService } from '#services/plan_service'
import User from '#models/user'
import { DateTime } from 'luxon'

export interface LimitCheckOptions {
  feature: 'scheduling' | 'accounts' | 'feeds' | 'followerLoading' | 'followActions' | 'dmCampaigns'
  redirectOnLimit?: string
  jsonOnLimit?: boolean
}

export default class PlanLimitMiddleware {
  async handle(
    { auth, response, session }: HttpContext,
    next: NextFn,
    options: LimitCheckOptions
  ) {
    // Vérifier silencieusement l'authentification
    await auth.check()
    const user = auth.user
    
    // Si l'utilisateur n'est pas connecté, laisser passer (pour la création de compte)
    if (!user) {
      console.log(`[PLAN_LIMIT] No user authenticated, skipping limit check for feature: ${options.feature}`)
      return next()
    }

    // Précharger les relations nécessaires
    await user.load('account')
    await user.load('twitterAccounts') 
    await user.load('scheduling')

    const userPlan = user.plan || 'free'
    const limits = PlanService.getLimitsForPlan(userPlan)
    const canProceed = await this.checkLimit(user, options.feature, limits)

    if (!canProceed) {
      const recommendedPlan = PlanService.getRecommendedPlanForFeature(
        this.mapFeatureToLimitKey(options.feature)
      )

      if (options.jsonOnLimit) {
        return response.status(403).json({
          error: 'Limite atteinte',
          message: this.getLimitMessage(options.feature, userPlan),
          recommendedPlan,
          upgradeUrl: `/upgrade/${recommendedPlan}`
        })
      }

      session.flash('error', this.getLimitMessage(options.feature, userPlan))
      session.flash('recommendedPlan', recommendedPlan)
      
      if (options.redirectOnLimit) {
        return response.redirect(options.redirectOnLimit)
      }
      
      return response.redirect().back()
    }

    await next()
  }

  private async checkLimit(
    user: User, 
    feature: LimitCheckOptions['feature'], 
    limits: any
  ): Promise<boolean> {
    switch (feature) {
      case 'scheduling':
        const scheduledCount = user.scheduling?.length || 0
        return !PlanService.isLimitReached(scheduledCount, limits.maxScheduledPosts)

      case 'accounts':
        const blueskyAccountsCount = user.account?.length || 0
        const twitterAccountsCount = user.twitterAccounts?.length || 0
        const totalAccountsCount = blueskyAccountsCount + twitterAccountsCount
        return !PlanService.isLimitReached(totalAccountsCount, limits.maxAccounts)

      case 'feeds':
        // Compter le nombre total de feeds sur tous les comptes
        let totalFeeds = 0
        if (user.account) {
          for (const account of user.account) {
            await account.load('feed')
            totalFeeds += account.feed?.length || 0
          }
        }
        return !PlanService.isLimitReached(totalFeeds, limits.maxFeeds)

      case 'followerLoading':
        // Vérifier les chargements de followers ce mois-ci
        const loadingsThisMonth = user.followerLoadingsThisMonth || 0
        return !PlanService.isLimitReached(loadingsThisMonth, limits.followerLoadingsPerMonth)

      case 'followActions':
        // Vérifier les actions de follow aujourd'hui
        const today = DateTime.now().startOf('day')
        const lastActionDate = user.lastFollowActionDate
        
        let dailyActions = user.dailyFollowActionsCount || 0
        
        // Reset le compteur si c'est un nouveau jour
        if (!lastActionDate || !lastActionDate.equals(today)) {
          dailyActions = 0
        }
        
        return !PlanService.isLimitReached(dailyActions, limits.dailyFollowActions)

      case 'dmCampaigns':
        return limits.dmCampaigns

      default:
        return true
    }
  }

  private mapFeatureToLimitKey(feature: LimitCheckOptions['feature']): any {
    const mapping = {
      'scheduling': 'maxScheduledPosts',
      'accounts': 'maxAccounts', 
      'feeds': 'maxFeeds',
      'followerLoading': 'followerLoadingsPerMonth',
      'followActions': 'dailyFollowActions',
      'dmCampaigns': 'dmCampaigns'
    }
    return mapping[feature]
  }

  private getLimitMessage(feature: LimitCheckOptions['feature'], currentPlan: string): string {
    const planInfo = PlanService.getPlanInfo(currentPlan)
    
    const messages = {
      'scheduling': `Limite de ${planInfo.limits.maxScheduledPosts} posts programmés atteinte`,
      'accounts': `Limite de ${planInfo.limits.maxAccounts} comptes atteinte`,
      'feeds': `Limite de ${planInfo.limits.maxFeeds} feeds atteinte`,
      'followerLoading': `Limite de ${planInfo.limits.followerLoadingsPerMonth} chargements par mois atteinte`,
      'followActions': `Limite de ${planInfo.limits.dailyFollowActions} actions par jour atteinte`,
      'dmCampaigns': 'Les campagnes DM ne sont pas disponibles sur votre plan'
    }

    return messages[feature] || 'Limite atteinte'
  }
}
