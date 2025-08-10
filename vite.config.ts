import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    react(),
    inertia({ ssr: { enabled: false } }),
    adonisjs({ 
      entrypoints: ['inertia/app/app.tsx'], 
      reload: ['resources/views/**/*.edge'] 
    })
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${getDirname(import.meta.url)}/inertia/`,
      '@': `${getDirname(import.meta.url)}/inertia/lib`,
      '@/components': `${getDirname(import.meta.url)}/inertia/components`,
      '@/utils': `${getDirname(import.meta.url)}/inertia/lib/utils`,
    },
  },

  server: {
    allowedHosts: ['bluesky-bot.com', 'localhost', '127.0.0.1'],
    hmr: {
      host: 'localhost'
    }
  },

  build: {
    outDir: 'public/assets',
    manifest: true,
    rollupOptions: {
      input: 'inertia/app/app.tsx'
    }
  },
})
