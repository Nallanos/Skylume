/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

export default async function render(page: any) {
  const { renderToString } = await import('react-dom/server')
  const { createInertiaApp } = await import('@inertiajs/react')
  const { resolvePageComponent } = await import('@adonisjs/inertia/helpers')
  const { createElement } = await import('react')

  return createInertiaApp({
    page,
    render: renderToString,
    title: (title: string) => `${title} - AdonisJS`,
    resolve: (name: string) => {
      return resolvePageComponent(
        `../pages/${name}.tsx`,
        (import.meta as any).glob('../pages/**/*.tsx')
      )
    },
    setup: ({ App, props }) => createElement(App, props),
  })
}
