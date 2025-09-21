import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Domain redirect middleware handles legacy domain redirects
 * Redirects old domain (bluesky-bot.com) to new domain (skylume.app)
 * while maintaining backward compatibility
 */
export default class DomainRedirectMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Only apply redirects in production
    if (env.get('NODE_ENV') !== 'production') {
      return next()
    }

    const host = ctx.request.header('host')
    
    // If request is coming from old domain, redirect to new domain
    if (host && (host === 'bluesky-bot.com' || host === 'www.bluesky-bot.com')) {
      const protocol = ctx.request.header('x-forwarded-proto') || 'https'
      const path = ctx.request.url()
      const newUrl = `${protocol}://skylume.app${path}`
      
      // Use 301 permanent redirect for SEO benefits
      return ctx.response.redirect(newUrl, false, 301)
    }

    return next()
  }
}