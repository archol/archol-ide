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
    const comp = info.stack.get('Component')
    const tref = comp.refs.types.find(usetype.type.str)
    if (tref) {
      const compuri = tref.ref.defComp.uri.id.str
      const id = compuri + '_type_' + tref.ref.name.str
      info.src.require(id, '~/app/' + compuri + '/' + compuri, usetype)
      return id
    }
    throw info.ws.fatal('Erro ao usar tipo ' + usetype.type.str, usetype)
  },
  UseTypeAsArray(w, usetype, info) {
    return ['Array<', usetype.itemType, '>']
  }
}, {})
