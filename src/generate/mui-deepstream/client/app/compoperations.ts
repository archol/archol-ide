import { CodeLines, CodePartL, CodePartLines } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isWidgetContent, isWidgetEntry, isWidgetMarkdown, WidgetContent, WidgetEntry, WidgetMarkdown } from 'load/types'
import { genUseType } from '../../common/useType'

export const generateClientCompOperations = sourceTransformer({
  multiple: true,
  cfg: {},
  transformations: {
    Application(w, app) {
      return app.uses.props.map((compuse) => {
        return compuse.val.ref(compuse.val.sourceRef)
      })
    },
    Component(w, comp, { transformFile }) {
      const compuri = comp.uri.id.str
      comp.operations.props.forEach((v) => {
        transformFile('~/app/' + comp.uri.id.str + '/operations/' + v.key.str + '.ts', genOperation.make(v.val, { compuri }))
      })
      return ''
    },
  }
})

const genOperation = nodeTransformer({
  Operation(w, op, { ws, src, cfg }) {

    const body: CodePartL[] = [
      ['return executeOperation(input)']
    ]
    const opId = cfg.compuri + '_operation_' + op.name.str
    src.require('OperationContext', '~/lib/archol/operations', op)
    src.require('executeOperation', '~/lib/archol/operations', op)
    src.require('T' + opId + 'Exec', '~/app/typings', op);
    src.require('T' + opId + 'Input', '~/app/typings', op);
    src.require('T' + opId + 'Output', '~/app/typings', op);

    return w.statements([
      [
        'export const ', opId + ': T' + opId + 'Exec = ', w.funcDecl([
          'input: T' + opId + 'Input'
        ], 'OperationContext<T' + opId + 'Output>',
          body, { arrow: true }
        )
      ]
    ], false)
  },
}, { compuri: '' })
