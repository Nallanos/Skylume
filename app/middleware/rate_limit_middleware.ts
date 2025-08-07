import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

interface RateLimitOptions {
  max: number
  windowMs: number
  keyGenerator?: (ctx: HttpContext) => string
}

export default class RateLimitMiddleware {
  private options: RateLimitOptions

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (ctx) => ctx.request.ip(),
      ...options
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const key = `rate_limit:${this.options.keyGenerator!(ctx)}`
    const windowStart = Math.floor(Date.now() / this.options.windowMs)
    const redisKey = `${key}:${windowStart}`

    try {
      // Obtenir le compte actuel
      const current = await redis.incr(redisKey)
      
      // Définir l'expiration lors de la première requête
      if (current === 1) {
        await redis.expire(redisKey, Math.ceil(this.options.windowMs / 1000))
      }

      // Ajouter les headers de rate limiting
      ctx.response.header('X-RateLimit-Limit', this.options.max.toString())
      ctx.response.header('X-RateLimit-Remaining', Math.max(0, this.options.max - current).toString())
      ctx.response.header('X-RateLimit-Reset', ((windowStart + 1) * this.options.windowMs).toString())

      // Vérifier si la limite est dépassée
      if (current > this.options.max) {
        ctx.response.header('Retry-After', Math.ceil(this.options.windowMs / 1000).toString())
        return ctx.response.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(this.options.windowMs / 1000)} seconds.`
        })
      }

      await next()
    } catch (error) {
      // En cas d'erreur Redis, laisser passer (fail-open)
      console.error('Rate limiting error:', error)
      await next()
    }
  }
}

// Factories pour différents types de rate limiting
export const apiRateLimit = () => new RateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000, // 100 requêtes par minute
})

export const authRateLimit = () => new RateLimitMiddleware({
  max: 5,
  windowMs: 15 * 60 * 1000, // 5 tentatives par 15 minutes
  keyGenerator: (ctx) => `auth:${ctx.request.ip()}`
})

export const stripeWebhookRateLimit = () => new RateLimitMiddleware({
  max: 1000,
  windowMs: 60 * 1000, // 1000 requêtes par minute pour Stripe
  keyGenerator: () => 'stripe-webhook'
})
