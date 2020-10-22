import { sourceTransformer } from 'generate/lib/generator'

export const generateClientRoutes = sourceTransformer({
  filePath: 'app/routes.tsx',
  transformations: {
    Application(w, app, {src}) {
      src.requireDefault('React', 'react', app)
      src.require('AppRoute', 'lib', app)

      return w.statements([
        ['export const routes: AppRoute[] = ', w.map([app.routes])],
      ], false)
    },
    RouteCode(w, route) {
      return w.object({
        path: route.path,
        component: w.code(route.code, { after: ['return <AppContent />'], forceRetType: '' })
      })
    },
    RouteRedirect(w, route) {
      return w.object({
        path: route.path,
        component: [
          '()=>', w.statements([
            ['return <Redirect to=', route.redirect, ' />']
          ], true)]
      })
    }
  }
})

