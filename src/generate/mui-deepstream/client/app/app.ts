import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { generatePkgUses } from './pkguses'

export const generateClientApp = sourceTransformer({
  filePath: '~/app/app.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {
      return w.statements([
        ['export const appInstance = ', w.object({
          name: app.name,
          package: app.uses,
          start: r('start'),
          login: r('login'),
          error: r('error'),
        })],
      ], false)
      function r(n: 'start' | 'login' | 'error') {
        const rref = app[n].ref(app[n])
        const pkguri = rref.refs.package.uri.id.str
        const rid = pkguri + '_proc_' + rref.name.str + 'Decl'
        src.require(rid, '~/app/' + pkguri + '/' + pkguri, app[n])
        return w.funcDecl([], '', [
          [
            'return ', rid, '.instanciate({})'
          ]
        ], { async: true })
      }
    },
    ...generatePkgUses.transformerFactory
  }
})
