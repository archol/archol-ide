import { nodeTransformer } from "generate/lib/generator"
import { normalTypes } from 'load/types'

export const genUseType = nodeTransformer({
  UseType1(w, usetype, info) {
    const refType = usetype.ref(usetype)
    const normalType: boolean = (normalTypes as any)[refType.name.str]
    if (normalType) {
      info.src.require(refType.name.str + 'Type', '~/lib/archol/normalTypes', usetype)
      return refType.name.str + 'Type'
    }
    const pkg = info.stack.get('Package')
    const tref = pkg.refs.types.find(usetype.type.str)
    if (tref) {
      const pkguri = tref.ref.defPkg.uri.id.str
      const id = pkguri + '_type_' + tref.ref.name.str
      info.src.require(id, '~/app/' + pkguri + '/' + pkguri, usetype)
      return id
    }
    throw info.ws.fatal('Erro ao usar tipo ' + usetype.type.str, usetype)
  },
  UseTypeAsArray(w, usetype, info) {
    return ['Array<', usetype.itemType, '>']
  }
}, {})
