/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

// Initialisation du thème en fonction des préférences de l'utilisateur et du système
// Cette partie est déjà gérée par le script dans inertia_layout.edge

import '../css/app.css';
import { createInertiaApp } from '@inertiajs/svelte'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { router } from '@inertiajs/svelte'

// Ajouter un hook de navigation pour maintenir la cohérence du thème
router.on('navigate', () => {
  // Récupérer le thème en cours à chaque navigation
  const currentTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // S'assurer que la classe HTML est correcte pour éviter les flashs
  document.documentElement.className = currentTheme;
})

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  title: (title: any) => `${title} - ${appName}`,

  resolve: (name: any) => {
    return resolvePageComponent(
      `../pages/${name}.svelte`,
      import.meta.glob('../pages/**/*.svelte'),
    )
  },

  setup({ el, App, props }: any) {
    new App({ target: el, props, hydrate: true })
  },
})