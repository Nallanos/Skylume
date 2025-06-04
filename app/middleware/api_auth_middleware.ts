import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Middleware d'authentification pour les requêtes API internes
 * Vérifie la présence et la validité de la clé API dans les headers
 */
export default class ApiAuthMiddleware {

  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx

    // Récupérer la clé API depuis les headers (support de plusieurs formats)
    const providedApiKey = request.header('x-api-key') ||
      request.header('x-internal-api-key') ||
      request.header('authorization')?.replace('Bearer ', '')

    if (!providedApiKey) {
      return response.status(401).json({
        error: 'API key required',
        message: 'Missing x-api-key, x-internal-api-key header or authorization bearer token'
      })
    }

    // Vérifier la clé API contre la variable d'environnement
    const validApiKey = env.get('INTERNAL_API_KEY')

    if (!validApiKey) {
      return response.status(500).json({
        error: 'Server configuration error',
        message: 'Internal API key not configured'
      })
    }

    if (providedApiKey !== validApiKey) {
      return response.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      })
    }

    // Ajouter des informations de contexte pour les logs
    ctx.logger.info('Internal API request authenticated', {
      endpoint: request.url(),
      method: request.method(),
      ip: request.ip()
    })

    return next()
  }
}