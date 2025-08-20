import type { HttpContext } from '@adonisjs/core/http'
import { PlanService } from '#services/plan_service'
import { UsageTrackingService } from '#services/usage_tracking_service'

export default class PlansController {
  /**
   * Affiche la page des plans
   */
  public async index({ inertia, auth }: HttpContext) {
    const user = auth.user
    const plans = PlanService.getAllPlans()
    
    return inertia.render('pricing', {
      plans,
      currentPlan: user?.plan || 'free'
    })
  }

  /**
   * Obtient le statut d'utilisation de l'utilisateur actuel
   */
  public async getUsageStatus({ auth, response }: HttpContext) {
    const user = await auth.authenticate()
    const usageStatus = await UsageTrackingService.getUsageStatus(user.id)
    
    return response.json(usageStatus)
  }

  /**
   * Vérifie si l'utilisateur peut effectuer une action
   */
  public async canPerformAction({ auth, request, response }: HttpContext) {
    const user = await auth.authenticate()
    const { action } = request.only(['action'])
    
    const result = await UsageTrackingService.canPerformAction(user.id, action)
    
    return response.json(result)
  }

  /**
   * API endpoint pour obtenir les informations d'un plan
   */
  public async getPlanInfo({ request, response }: HttpContext) {
    const { plan } = request.only(['plan'])
    const planInfo = PlanService.getPlanInfo(plan)
    
    return response.json(planInfo)
  }

  /**
   * Dashboard avec indicateurs de limites
   */
  public async dashboard({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    const usageStatus = await UsageTrackingService.getUsageStatus(user.id)
    const currentPlan = PlanService.getPlanInfo(user.plan || 'free')
    
    // Déterminer quelles limites sont proches d'être atteintes
    const warnings = []
    
    if (PlanService.isApproachingLimit(usageStatus.scheduledPosts.current, usageStatus.scheduledPosts.limit)) {
      warnings.push({
        type: 'scheduledPosts',
        message: `Vous approchez de la limite de posts programmés (${usageStatus.scheduledPosts.current}/${usageStatus.scheduledPosts.limit})`,
        recommendedPlan: PlanService.getRecommendedPlanForFeature('maxScheduledPosts')
      })
    }
    
    if (PlanService.isApproachingLimit(usageStatus.accounts.current, usageStatus.accounts.limit)) {
      warnings.push({
        type: 'accounts',
        message: `Vous approchez de la limite de comptes (${usageStatus.accounts.current}/${usageStatus.accounts.limit})`,
        recommendedPlan: PlanService.getRecommendedPlanForFeature('maxAccounts')
      })
    }
    
    if (PlanService.isApproachingLimit(usageStatus.followerLoadings.current, usageStatus.followerLoadings.limit)) {
      warnings.push({
        type: 'followerLoadings',
        message: `Vous approchez de la limite d'analyses followers ce mois (${usageStatus.followerLoadings.current}/${usageStatus.followerLoadings.limit})`,
        recommendedPlan: PlanService.getRecommendedPlanForFeature('followerLoadingsPerMonth')
      })
    }

    return inertia.render('dashboard', {
      usageStatus,
      currentPlan,
      warnings
    })
  }
}
