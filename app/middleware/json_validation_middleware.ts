import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour valider et sécuriser les requêtes JSON des endpoints Python
 */
export default class JsonValidationMiddleware {
  async handle({ request, response, logger }: HttpContext, next: NextFn) {
    // Only apply to POST requests
    if (request.method() !== 'POST') {
      return next()
    }

    // Validate Content-Type header
    const contentType = request.header('content-type')
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      logger.error('Invalid Content-Type for JSON endpoint:', {
        contentType,
        url: request.url(),
        method: request.method()
      })

      return response.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json',
        received: contentType || 'none'
      })
    }

    // Validate Content-Length
    const contentLength = request.header('content-length')
    if (!contentLength || parseInt(contentLength) === 0) {
      logger.error('Missing or empty body for JSON endpoint:', {
        contentLength,
        url: request.url()
      })

      return response.status(400).json({
        status: 'error',
        message: 'Request body is required'
      })
    }

    // Try to pre-validate JSON before bodyparser processes it
    try {
      const rawBody = request.raw()
      if (rawBody) {
        // Test if it's valid JSON
        JSON.parse(rawBody)
        logger.info('JSON validation passed for:', request.url())
      }
    } catch (jsonError) {
      logger.error('Invalid JSON in request body:', {
        error: jsonError.message,
        url: request.url(),
        bodyPreview: request.raw()?.substring(0, 200)
      })

      return response.status(400).json({
        status: 'error',
        message: 'Invalid JSON format in request body',
        details: jsonError.message
      })
    }

    return next()
  }
}
