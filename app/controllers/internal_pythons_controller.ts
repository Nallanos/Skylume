import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'

export default class InternalPythonsController {
  /**
   * Récupère les données d'un compte pour le service Python
   */
  async getAccount({ params, response }: HttpContext) {
    try {
      const account = await Account.findByOrFail('handle', params.handle)

      return response.ok({
        success: true,
        account: {
          id: account.id,
          handle: account.handle,
          app_password: account.appPassword,
          display_name: account.handle, // Using handle as display name since displayName doesn't exist
        },
      })
    } catch (error) {
      return response.notFound({
        success: false,
        message: `Account with handle "${params.handle}" not found`,
      })
    }
  }

  /**
   * Health check endpoint
   */
  async health({ response }: HttpContext) {
    return response.ok({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  }
}