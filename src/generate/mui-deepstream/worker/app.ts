import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'


export const generateWorkerIndex = sourceTransformer({
  filePath: '~/app/worker/index.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { transformFile, src }) {

      return w.statements([
        'const ctx: Worker = self as any',
        'ctx.postMessage()'
      ], false)
    }
  }
})


doc semelhante a record / list mas com validação

fazer open doc
set doc 
