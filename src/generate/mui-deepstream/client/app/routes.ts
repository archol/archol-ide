import { generator } from 'generate/lib/generator'

export const generateClientRoutes = generator({
  project: 'client',
  file: 'app/routes.tsx',
  opts: {},
  transverse: {
    Application(w, app) {
      return w.lines([
        `import React from 'react'`,
        `import { AppRoute } from '../lib'`,
        `import { Roles } from './roles'`,
        '',
        'export const routes: AppRoute[] = ', w.map(app.routes),
      ], "no")
    },
    RouteCode(w, route) {
      return w.object({
        path: route.path,
        code: route.code
      })
    },
    RouteRedirect(w, route) {
      return w.object({
        path: route.path,
        redirect: route.redirect
      })
    }
  }
})

