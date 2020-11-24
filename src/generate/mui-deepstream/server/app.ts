import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { generateServerCompDocs } from './docs/compdocs'

// doc semelhante a record / list mas com validação

// fazer open doc
// set doc 

export const generateServerIndex = sourceTransformer({
  filePath: '~/app/app.ts',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {
      return w.statements([
        //        'const ctx: Worker = self as any',
        //        'ctx.postMessage()'
        app.uses
      ], false)
    },
    ComponentUses(w, comps) {
      return [w.mapObj(comps, (val, key) => val)]
    },
    ComponentUse(w, comp, { src }) {
      return src.chip(1, genCompRef.make(comp.ref(comp), {}))
    },
  }
})

const genCompRef = nodeTransformer({
  Component(w, comp, { src, transformFile }) {

    const compuri = comp.uri.id.str
    const id = 'T' + compuri + 'Ref'
    return w.chipResult(id, [
      ['export interface ' + id,
      w.object({
        documents: w.mapObj(comp.documents, (val, key) => {
          const docuri = compuri + '_document_' + val.name.str
          const docsrc = '~/app/' + compuri + '/document/' + val.name.str
          src.require(docuri, docsrc, val)
          transformFile(docsrc + '.ts', generateServerCompDocs.make(val, { compuri, docuri }))
          return id
        }),
        // operation: w.mapObj(comp.operations, (val, key) =>
        //   src.chip(30,
        //     genOpInstanceType.make(val, { compuri }))
        // ),
      })]
    ], false)
  },
}, {})