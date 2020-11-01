import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { generatePkgUses } from './pkguses'

export const generateClientApp = sourceTransformer({
  filePath: '~/app/app.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {
      const startRef = app.start.ref(app.start)
      const pkguri = startRef.refs.package.uri.id.str
      const startId = pkguri + '_proc_' + startRef.name.str + 'Decl'
      src.require(startId, '~/app/' + pkguri + '/' + pkguri, app.start)
      return w.statements([
        ['export const appInstance = ', app.uses],
        ['export const ' + app.name.str + '=appInstance'],
        ['export async function appStart', w.funcDecl([], '', [
          [
            'return ', startId, '.instanciate({})'
          ]
        ])],
      ], false)
    },
    ...generatePkgUses.transformerFactory
  }
})
