/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { router } from '@inertiajs/react'

router.on('navigate', () => {
  const currentTheme =
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  document.documentElement.className = currentTheme
})

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title: string) => `${title} - ${appName}`,

  resolve: (name: string) => {
    return resolvePageComponent(
      `../pages/${name}.tsx`,
      (import.meta as any).glob('../pages/**/*.tsx')
    )
  },

  setup({ el, App, props }) {
    const root = createRoot(el)
    root.render(<App {...props} />)
  },
})
