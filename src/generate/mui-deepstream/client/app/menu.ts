import { sourceTransformer } from 'generate/lib/generator'
import { Code, isCode, isStringConst, SourceNode, StringConst } from 'load/types'
import { isTemplateExpression } from 'typescript'
import { genI18N } from './i18n'
import { genIcon } from './icon'
import { genUseRoles } from './roles'

export const generateClientMenu = sourceTransformer({
  filePath: '~/app/menu.ts',
  transformations: {
    Application(w, app, { src }) {
      src.require('AppMenuItem', '~/lib/archol/types', app)

      return w.statements([
        ['export const menu: AppMenuItem[] = ', app.menu],
      ], false)
    },
    // Menu(w, menu) {
    //   return w.map(menu, (menuitem) => {
    //     return w.object({
    //       description: genI18N,
    //       icon: genIcon,
    //     }
    //   })
    // }
    MenuItem(w, menuitem, info) {
      return w.object({
        caption: genI18N,
        icon: genIcon,
        allow: genUseRoles,
        run(v) {
          if (isCode(v)) return w.code(v)
          if (isStringConst(v)) {
            info.src.require('appWindowDoc', '~/docs/app/appwindow', v)
            return w.funcDecl([], '', [
              ['appWindowDoc.goUrl(', w.string(v), ')']
            ])
          }
          throw info.ws.fatal('conteúdo inesperado ', v)
        }
      }, menuitem)
    }
  },
  cfg: {}
})

