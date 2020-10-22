import { nodeTransformer } from "generate/lib/generator"

export const genIcon = nodeTransformer({
  Icon(w, icon, info) {
    if (!icon.icon.startsWith('mui/')) throw info.ws.fatal('suporta apenas a icones mui', icon)
    const src = info.src
    if (!src) throw info.ws.fatal('info precisa ter src', icon)
    const name = icon.icon.substr(4)
    const id = 'Icon' + name
    src.requireDefault(id, '@material-ui/icons/' + name, icon)
    return id
  }
})
