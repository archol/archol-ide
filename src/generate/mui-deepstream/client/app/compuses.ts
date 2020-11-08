import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { propByPathTransverser } from 'generate/lib/transverses/propByPathTransverser'
import { withPathTransverser } from 'generate/lib/transverses/withPathTransverser'
import { isCodeNode } from 'load/types'

export const generateCompUses = nodeTransformer({
  ComponentUses(w, comps, { src }) {
    return [w.mapObj(comps, (comp, key) => {
      const compuri = comp.ref(comp).uri.id.str
      src.require(compuri + 'Instance', '~/app/' + compuri + '/' + compuri, comp)
      return comp
    })]
  },
  ComponentUse(w, comp, { transformFile, src, ws, fileIsEmpty }) {
    const compuri = comp.ref(comp).uri.id.str
    const compsource = '~/app/' + compuri + '/' + compuri
    if (fileIsEmpty(compsource))
      transformFile(compsource + '.tsx', genCompRef.make(comp.ref(comp), { compuri }))
    return compuri + 'Instance'
  },
}, {})

const genCompRef = nodeTransformer({
  Component(w, comp, { src }) {
    const compuri = comp.uri.id.str
    return w.statements([
      [
        'export const ', compuri, 'Instance = ',
        w.object({
          type: w.mapObj(comp.types, (val) => {
            const id = compuri + '_type_' + val.name.str
            src.require(id, '~/app/' + compuri + '/types/' + val.name.str, val)
            return id
          }),
          process: w.mapObj(comp.processes, (val, key) => {
            const id = compuri + '_process_' + val.name.str
            src.require(id, '~/app/' + compuri + '/processes/' + val.name.str, val)
            return id
          }),
          operation: w.mapObj(comp.operations, (val, key) =>
            src.chip(-10, genOperation.make(val, { compuri }))
          ),
          // view: w.mapObj(comp.views, (val, key) =>
          //   src.chip(-10, genViewInstanceType.make(val, { compuri }))
          // )
        })
      ]
    ], false)
  },
}, {})

const genOperation = nodeTransformer({
  Operation(w, op, { ws, src, cfg }) {

    const body: CodePartL[] = [
      ['return executeOperation(input)']
    ]
    const opId = cfg.compuri + '_operation_' + op.name.str
    src.require('OperationContext', '~/lib/archol/operations', op)
    src.require('executeOperation', '~/lib/archol/operations', op)
    src.require('T' + opId + 'Exec', '~/app/typings', op);
    src.require('T' + opId + 'Output', '~/app/typings', op);
    src.require('T' + opId + 'Output', '~/app/typings', op);

    return w.chipResult(opId + 'Exec', [
      [
        'export function ', opId + 'Exec', w.funcDecl([
          'input: T' + opId + 'Input'
        ], 'OperationContext<T' + opId + 'Output>', body
        )
      ]
    ], false)
  },
}, { compuri: '' })

// const genViewInstanceType = nodeTransformer({
//   View(w, view, info) {
//     const viewuri = info.cfg.compuri + '_view_' + view.name.str
//     info.src.require('ArcholViewInstance', '~/lib/archol/types', view)
//     info.src.require('T' + viewuri + 'Binder', '~/app/typings', view)
//     return w.chipResult(viewuri + 'Binder', [
//       [
//         'export function ' + viewuri + 'Binder',
//         w.funcDecl(['from: any', 'to: any'], 'T' + viewuri + 'Binder', [
//           'return'
//         ])
//       ]
//     ], false)
//   },
// }, { compuri: '' })

/*
cadastro/telaBadosBasicos
  cof, nome, email

            bind: {
              cpf: 'input.cpf',
              nome: 'local.nome',
              email: 'local.email',
            }
*/