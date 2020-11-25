import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genUseType } from 'generate/mui-deepstream/common/useType'

export const generateServerCompDocs = nodeTransformer({
  Document(w, doc, { src, cfg }) {
    const pubid = 'doc:' + cfg.docuri
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
    // return app.uses.props.map((compuse) => {
    //   return compuse.val.ref(compuse.val.sourceRef)
    // })
  },
  ...genUseType.transformerFactory,
}, { compuri: '', docuri: '' })


// gerar ws
// gerar http get
// nao ter insert / delete /update 
// só actions do doc 
