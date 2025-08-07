import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * Middleware de sécurité pour ajouter des headers de sécurité supplémentaires
 */
export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()

    // Headers de sécurité recommandés
    ctx.response.header('X-Content-Type-Options', 'nosniff')
    ctx.response.header('X-Frame-Options', 'DENY')
    ctx.response.header('X-XSS-Protection', '1; mode=block')
    ctx.response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    ctx.response.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // En production, forcer HTTPS
    if (app.inProduction) {
      ctx.response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    // Masquer la version du serveur
    ctx.response.removeHeader('X-Powered-By')
    ctx.response.removeHeader('Server')
  }
}
