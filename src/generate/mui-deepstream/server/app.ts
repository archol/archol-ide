import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genUseType } from '../common/useType'

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
        ['export const appInstance=', app.uses]
      ], false)
    },
    ComponentUses(w, comps) {
      return [w.mapObj(comps, (val, key) => generateDataCenarioContent.make(val, {}))]
    }
  }
})

const generateDataCenarioContent = nodeTransformer({
  ComponentUse(w, compu, { src, transformFile }) {
    const comp = compu.ref(compu)
    const compuri = comp.uri.id.str
    const compsrc = '~/app/' + compuri + '/' + compuri
    src.require(compuri, compsrc, compu)
    transformFile(compsrc + '.ts', generateDataCenarioContent.make(comp, {}))
    return compuri
  },
  Component(w, comp, { src, transformFile }) {
    const compuri = comp.uri.id.str
    return [
      'export const ' + compuri + '=',
      w.object({
        types: w.mapObj(comp.types, (val, key) => {
          const typeuri = compuri + '_type_' + val.name.str
          const typesrc = '~/app/' + compuri + '/types/' + val.name.str
          src.require(typeuri, typesrc, val)
          return typeuri
        }),
        documents: w.mapObj(comp.documents, (val, key) => {
          const docuri = compuri + '_document_' + val.name.str
          const docsrc = '~/app/' + compuri + '/document/' + val.name.str
          src.require(docuri, docsrc, val)
          transformFile(docsrc + '.ts', generateDataCenarioContent.make(val, { compuri, docuri }))
          return docuri
        }),
        // operation: w.mapObj(comp.operations, (val, key) =>
        //   src.chip(30,
        //     genOpInstanceType.make(val, { compuri }))
        // ),
      })
    ]
  },
  ...genUseType.transformerFactory,
  Document(w, doc, { src, cfg }) {
    src.require('ColId', '~/lib/types', doc)
    src.require('CollecionDecl', '~/lib/types', doc)
    src.require('T' + doc.nodeMapping.uri(), '~/app/typings', doc)
    return [
      [
        'export const ', doc.nodeMapping.uri(), ': CollecionDecl<T', doc.nodeMapping.uri, '> = ',
        w.object({
          collection: [w.string(doc.nodeMapping.uri()), ' as ColId'],
          identification: w.string(doc.identification),
          validate: w.funcDecl(['doc'], '',
            [
              [
                'return ',
                w.lines(doc.primaryFields.props.concat(doc.secondaryFields.props).map((f, idx, arr) => {
                  const ftype = f.val.type.ref(f.val)
                  if (!ftype.validate) return null
                  return [
                    f.val.type,
                    '.validate(doc.',
                    f.key.str,
                    ')'
                  ]
                }), '', 'undefined', '||')
              ]])
        })
      ],
    ]
    // return app.uses.props.map((cxompuse) => {
    //   return compuse.val.ref(compuse.val.sourceRef)
    // })
  }
}, {})

// gerar ws
// gerar http get
// nao ter insert / delete /update 
// só actions do doc 
