import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour déboguer les requêtes problématiques
 */
export default class RequestDebugMiddleware {
  async handle({ request, logger }: HttpContext, next: NextFn) {
    // Only debug Python internal endpoints
    if (request.url().includes('/internal/python')) {
      logger.info('Python request debug:', {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        contentType: request.header('content-type'),
        contentLength: request.header('content-length'),
        hasBody: request.method() === 'POST',
      })

      // Try to peek at raw body before parsing for debugging
      if (request.method() === 'POST' && request.header('content-length')) {
        try {
          const raw = request.raw()
          if (raw) {
            const preview = raw.substring(0, 500)
            logger.info('Raw body preview:', preview)

            // Check if it's valid JSON
            try {
              JSON.parse(raw)
              logger.info('Body contains valid JSON')
            } catch (jsonError) {
              logger.error('Body contains invalid JSON:', {
                error: jsonError.message,
                preview: preview,
              })
            }
          }
        } catch (e) {
          logger.error('Could not read raw body:', e.message)
        }
      }
    }

    try {
      await next()
    } catch (error) {
      if (request.url().includes('/internal/python')) {
        logger.error('Error processing Python request:', {
          error: error.message,
          stack: error.stack,
          url: request.url(),
        })
      }
      throw error
    }
  }
}