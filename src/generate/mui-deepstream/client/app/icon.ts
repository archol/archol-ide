import { nodeTransformer } from "generate/lib/generator"

export const genIcon = nodeTransformer({
  Icon(w, icon) {
    return icon.icon
  }
})
