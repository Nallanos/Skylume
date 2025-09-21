/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { router } from '@inertiajs/react'
import axios from 'axios'

// Configure axios to include CSRF token automatically
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (token) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = token
}

// Configure fetch requests to include CSRF token
const originalFetch = window.fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (token && init) {
    init.headers = {
      ...init.headers,
      'X-CSRF-TOKEN': token
    }
  } else if (token && !init) {
    init = {
      headers: {
        'X-CSRF-TOKEN': token
      }
    }
  }
  return originalFetch.call(this, input, init)
}

router.on('navigate', () => {
  const currentTheme =
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  document.documentElement.className = currentTheme
})

const appName = import.meta.env.VITE_APP_NAME || 'Skylume'

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
