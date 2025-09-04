import type { HttpContext } from '@adonisjs/core/http'
import { BusinessPlanCounterService } from '#services/business_plan_counter_service'

export default class HomeController {
  public async index({ inertia }: HttpContext) {
    // Récupérer les informations du compteur business plan
    const businessPlanCounter = await BusinessPlanCounterService.getCounterInfo()

    return inertia.render('home', {
      businessPlanCounter
    })
  }
}
