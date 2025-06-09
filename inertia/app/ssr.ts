
import { createInertiaApp } from '@inertiajs/svelte'

export default function render(page: any) {
  return createInertiaApp({
    page,
    resolve: (name) => {
      const pages = import.meta.glob('../pages/**/*.svelte', { eager: true }) as Record<string, any>
      return pages[`../pages/${name}.svelte`]?.default || pages[`../pages/${name}.svelte`]
    }
  })
}