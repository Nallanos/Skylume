import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    react(),
    inertia({ ssr: { enabled: false } }),
    adonisjs({ entrypoints: ['inertia/app/app.tsx'], reload: ['resources/views/**/*.edge'] })
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
      '@inertiajs/react': `${getDirname(import.meta.url)}/node_modules/@inertiajs/react/dist/index.js`
    },
  },

  ssr: {
    resolve: {
      conditions: ['react-server', 'import', 'module', 'default'],
    },
    external: ['react', 'react-dom'],
  },
})
