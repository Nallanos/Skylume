import { defineConfig } from '@adonisjs/shield'

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
        'https://checkout.stripe.com',
        'https://www.googletagmanager.com',
        'https://region1.google-analytics.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour les styles inline de Tailwind
        'https://fonts.googleapis.com',
        'https://fonts.bunny.net'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://fonts.bunny.net',
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
        'https://bsky.social',
        'wss://bluesky-bot.com:24678',
        'ws://bluesky-bot.com:24678',
        'wss://localhost:24678',
        'ws://localhost:24678',
        'https://region1.google-analytics.com'
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
