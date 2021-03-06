import { CodePartL, CodePartLines } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { ParameterDeclaration } from 'ts-morph'
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
        ['export const appInstance=', app.uses] as CodePartL
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
    src.require('T' + compuri + 'Ref', '~/app/typings', comp)
    return [
      [
        'export const ' + compuri + ': T' + compuri + 'Ref =',
        w.object({
          type: w.mapObj(comp.types, (val, key) => {
            const typeuri = compuri + '_type_' + val.name.str
            const typesrc = '~/app/' + compuri + '/types/' + val.name.str
            src.require(typeuri, typesrc, val)
            return typeuri
          }),
          document: w.mapObj(comp.documents, (val, key) => {
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
    ]
  },
  ...genUseType.transformerFactory,
  Document(w, doc, { src, cfg }) {
    const coluri = doc.nodeMapping.uri()
    const colname = doc.nodeMapping.uri('_', true)
    const colData = 'T' + coluri + 'Data'
    const colExec = 'T' + coluri + 'Exec'
    src.require('ColId', '~/lib/types', doc)
    src.require('CollecionDecl', '~/lib/types', doc)
    src.require(colData, '~/app/typings', doc)
    src.require(colExec, '~/app/typings', doc)
    return [
      [
        'export const ', coluri,
        ': CollecionDecl<', colData, ',', colExec, '> = ',
        w.object({
          collection: [w.string(coluri), ' as ColId'],
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
              ]]),
          exec: w.mapObj(doc.actions, (ac) => {
            const acargs: Array<ParameterDeclaration | string> = ac.run && ac.run.params.length ? ac.run.params : ['data']
            if (ac.from) acargs.splice(1, 0, '$id: T' + coluri + 'GUID')
            const acret = (!ac.from) ?
              'Promise<T' + coluri + 'GUID>' : ((!ac.to) ? 'Promise<void>' :
                (ac.run && ac.run.ret.getText()) || 'Promise<void>'
              )
            const setStatus: CodePartL[] = ac.to && ac.to.states.items.length === 1 ? [
              ['data.$state=', ac.to.states.items[0]]
            ] : []
            const updatedb: CodePartL[] = ac.to ? (
              ac.from ? updateDoc() : insertDoc()
            ) : deleteDoc()
            const after: CodePartL[] = setStatus.concat(updatedb)
            if (ac.from) src.require('T' + coluri + 'GUID', '/app/typings', ac)
            return w.code(ac.run, {
              beforeParams: ['db'],
              forceParams: acargs,
              forceParamType(p, idx) {
                if (idx === 0) return colData
              },
              forceRetType: acret,
              after,
            })
            function insertDoc(): CodePartL[] {
              return [
                ['return db.', colname, '.insertOne( data)']
              ]
            }
            function updateDoc(): CodePartL[] {
              return [
                ['return db.', colname, '.updateOne(data)']
              ]
            }
            function deleteDoc(): CodePartL[] {
              return [
                ['return db.', colname, '.deleteOne(data.$id)']
              ]
            }
          })
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
