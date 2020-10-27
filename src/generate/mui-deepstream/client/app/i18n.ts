import { nodeTransformer } from "generate/lib/generator"

export const genI18N = nodeTransformer({
  I18N(w, i18n, info) {
    info.src.require('i18n', '~/docs/app/appi18n', i18n)
    return ['i18n(', w.mapObj(i18n.msg), ')']
  }
}, {})
