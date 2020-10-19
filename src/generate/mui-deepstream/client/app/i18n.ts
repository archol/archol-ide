import { nodeTransformer } from "generate/lib/generator"

export const genI18N = nodeTransformer({
  I18N(w, i18n) {
    return w.mapObj(i18n.msg)
  }
})
