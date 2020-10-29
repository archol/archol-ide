import { nodeTransformer } from 'generate/lib/generator'

export const genFieldsWithBase = nodeTransformer({
  Fields(w, fields, info) {
    return w.mapObj(fields, (f) => {
      return 'T' + f.type.base(f)
    })
  },
}, {})

export const genFieldsWithType = nodeTransformer({
  Fields(w, fields, info) {
    return w.mapObj(fields, (f) => {
      return 'T' + f.type.ref(f).name.str
    })
  },
}, {})