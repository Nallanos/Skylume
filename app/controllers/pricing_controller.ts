import type { HttpContext } from '@adonisjs/core/http'
import { BusinessPlanCounterService } from '#services/business_plan_counter_service'

export default class PricingController {
  public async index({ auth, inertia }: HttpContext) {
    // Récupérer l'utilisateur authentifié s'il existe
    let user = null
    try {
      user = await auth.authenticate()
    } catch {
      // Utilisateur non connecté, c'est OK
    }

    // Récupérer les informations du compteur business plan
    const businessPlanCounter = await BusinessPlanCounterService.getCounterInfo()

    return inertia.render('pricing', {
      user,
      businessPlanCounter
    })
  }
}
