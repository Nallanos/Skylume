import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export interface LimitCheckOptions {
  feature: 'scheduling' | 'accounts' | 'feeds' | 'followerLoading' | 'followActions' | 'dmCampaigns'
  redirectOnLimit?: string
  jsonOnLimit?: boolean
}

export default class PlanLimitMiddleware {
  async handle(
    { auth }: HttpContext,
    next: NextFn,
    options: LimitCheckOptions
  ) {
    await auth.check()
    
    console.log(`[PLAN_LIMIT] Feature ${options.feature} - All limits removed, proceeding`)
    
    return next()
  }
}
