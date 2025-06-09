import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import { sveltePreprocess } from 'svelte-preprocess';

export default defineConfig({
  plugins: [inertia({ ssr: { enabled: true, entrypoint: 'inertia/app/ssr.ts' } }), svelte({
    compilerOptions: { hydratable: true }, preprocess: [sveltePreprocess({ typescript: true })]
  },), adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] })],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${getDirname(import.meta.url)}/inertia/`,
      '@': `${getDirname(import.meta.url)}/inertia/lib`,
      '@inertiajs/svelte': `${getDirname(import.meta.url)}/node_modules/@inertiajs/svelte/dist/index.js`
    },
  },

  ssr: {
    resolve: {
      conditions: ['svelte', 'import', 'module', 'default'],
    },
  },
})
