
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFieldsWithBase, genFieldsWithType } from '../common/fields'
import { genUseType } from '../common/useType'

export const generateServerDbTest = sourceTransformer({
  filePath: '~/test/app.test.ts',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {
      app.testscenarios.items.forEach((cenario) => {
        transformFile('~/test/' + cenario.str + '/' + cenario.str + '.data.test.ts',
          generateDataCenarioIndex.make(app, { cenario: cenario.str }))
        app.uses.props.forEach(u => {
          const comp = u.val.ref(app)
          const c = comp.testing.get(cenario)
          if (c) {
            transformFile('~/test/' + cenario.str + '/' + comp.nodeMapping.uri() + '/' + comp.nodeMapping.uri() + '.cases.test.ts',
              generateCases.make(c, {}))
            // transformFile('~/test/' + cenario.str + '/' + comp.nodeMapping.uri + '/' + comp.nodeMapping.uri + '.data.test.ts',
            //   generateData.make(c, {}))
          }
        })
      })
      return []
    }
  }
})

const generateCases = nodeTransformer({
  CompTestingScenario(w, scenario, { src }) {
    src.require('expect', '~/lib/testing', scenario)
    src.require('createTestDatabase', '~/test/' + scenario.name.str + '/' + scenario.name.str + '.data.test', scenario)
    return w.statements([
      [
        "describe(", scenario.name, ',', w.funcDecl([], '', [
          ...scenario.cases.props.map((c) => [
            "it(", c.key, ',', w.code(c.val, {
              arrow: true, forceParams: [], forceRetType: '',
              before: [
                ['const {', c.val.params[0].getText(), ',', c.val.params[1].getText(), '}=await createTestDatabase()'],
              ]
            }), ')'
          ])
        ], { arrow: true }), ')'
      ]
    ], false)
  }
}, {})

const generateDataCenarioIndex = nodeTransformer({
  Application(w, app, { src, cfg, transformFile }) {
    src.require('appInstance', '~/app/app', app.sourceRef)
    return w.statements([
      [
        'export const ' + cfg.cenario + 'Data = ',
        w.mapObj(app.uses, (val) => {
          const comp = val.ref(val)
          const compid = comp.uri.id
          const c = comp.testing.get(cfg.cenario)
          if (c) {
            const cntsrc = '~/test/' + cfg.cenario + '/' + compid.str + '/' + compid.str + '.data.test'
            src.require('createTestDatabaseFor', '~/lib/testing', val)
            src.requireDefault(compid.str, cntsrc, val)
            transformFile(cntsrc + '.ts', generateDataCenarioContent.make(c.documents, { cenario: cfg.cenario }))
            return compid.str
          } else return w.object({})
        })
      ],
      [
        'export function createTestDatabase', w.funcDecl([], '', [
          'return createTestDatabaseFor()'
        ])
      ]
    ], false)
  },
}, { cenario: '' })

const generateDataCenarioContent = nodeTransformer({
  CompTestingDocuments(w, docs) {
    return ['export default ', w.mapObj(docs, (v) => v.data)]
  },
  CompTestingDocumentItem(w, doc) {
    return w.object(doc.data)
  },
}, { cenario: '' })

