import { defineConfig } from '@adonisjs/shield'
import env from '#start/env'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    enabled: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour Inertia.js
        'https://js.stripe.com',
        'https://checkout.stripe.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour les styles inline de Tailwind
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'wss://bsky.social',
        'https://bsky.social'
      ],
      frameSrc: [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com'
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    enabled: true,
    exceptRoutes: [
      '/stripe/webhook', // Exception pour les webhooks Stripe
      '/api/python/*' // Exception pour l'API Python interne
    ],
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
