import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'



export const generateWorkerCompDocs = nodeTransformer({
  Document(w, doc, { src, cfg }) {
    const pubid = 'doc:' + cfg.docuri
    src.require('db', '~/db', doc)
    src.require('ws', 'deepstream', doc)
    return [
      ['ws.o("nmessage", ', w.string(pubid), w.funcDecl(['ev'], '', [
        ['const { cmd, collection, query } = ev'],
        ['if (cmd==="open")', w.statements([
          ['db.find(', w.string(cfg.docuri), ',query).forEach(', w.funcDecl(['rec'], '', [

          ])]
        ], true)
        ])],
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


gerar ws
gerar http get
nao ter insert / delete /update 
só actions do doc 
