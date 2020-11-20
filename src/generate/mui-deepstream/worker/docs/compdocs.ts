import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateWorkerCompDocs = nodeTransformer({
  Document(w, doc, { src, cfg }) {
    src.require('DocActive', '~/lib/worker/types', doc)
    return [
      ['export const ', cfg.docuri, '=(function(){'],
      w.statements([
        ['const bc = new BroadcastChannel(', w.string('doc: ' + cfg.docuri), ');'],
        ['const active = DocActive = {}'],
        ['bc.onmessage = ', w.funcDecl(['e'], '', [
          ['if (e.data.cmd === ', w.string('open'), ')'],
          ['openDoc(e.data.id)'],
        ])
        ]
      ], false),
      ['})()']
    ]
    // return app.uses.props.map((compuse) => {
    //   return compuse.val.ref(compuse.val.sourceRef)
    // })
  },
}, { compuri: '', docuri: '' })

