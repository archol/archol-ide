import { nodeTransformer } from "generate/lib/generator"
import { normalTypes } from 'load/types'

export const genUseType = nodeTransformer({
  UseType1(w, usetype, info) {
    const ref = usetype.ref(usetype)
    const normalType: boolean = (normalTypes as any)[ref.name.str]
    if (normalType) {
      info.src.require(ref.name.str + 'Type', '~/lib/archol/normalTypes', usetype)
      return ref.name.str + 'Type'
    }
    const pkguri = ref.refs.pkg.uri.id.str
    const typeid = pkguri + '_type_' + ref.name.str
    info.src.require(typeid, '~/app/' + pkguri + '/' + pkguri, usetype)
    return typeid
  },
  UseTypeAsArray(w, usetype, info) {
    return ['Array<', usetype.itemType, '>']
  }
}, {})
