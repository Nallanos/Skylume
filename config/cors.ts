import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: env.get('NODE_ENV') === 'production' 
    ? [
        'https://skylume.app', 
        'https://www.skylume.app',
        'https://bluesky-bot.com', 
        'https://www.bluesky-bot.com'
      ]
    : true, // En développement, tout autoriser
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 86400, // 24 heures
})

export default corsConfig
