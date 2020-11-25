import { sourceTransformer } from 'generate/lib/generator'
import { generateCompUses } from './compuses'

export const generateClientApp = sourceTransformer({
  filePath: '~/app/app.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {
      return w.statements([
        ['export const appInstance = ', app.uses],
        ['export const appInfo = ', w.object({
          name: app.name,
          worker: ['new Worker(', w.string('./worker/index.ts'), ')'],
          start: r('start'),
          login: r('login'),
          error: r('error'),
        })],
      ], false)
      function r(n: 'start' | 'login' | 'error') {
        const rref = app[n].ref(app[n])
        const compuri = rref.refs.component.uri.id.str
        const rid = compuri + '_process_' + rref.name.str
        src.require(rid, '~/app/' + compuri + '/processes/' + rref.name.str, app[n])
        return w.funcDecl([], '', [
          [
            'return ', rid, '.instanciate({})'
          ]
        ], { async: true })
      }
    },
    ...generateCompUses.transformerFactory
  }
})
