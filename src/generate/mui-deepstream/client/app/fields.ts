import { nodeTransformer } from 'generate/lib/generator'

export const genFields = nodeTransformer({
  Fields(w, fields, info) {
    return w.mapObj(fields, (f) => {
      return 'T' + f.type.base(f)
    })
  },
}, {})