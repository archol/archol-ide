import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isWidgetContent, isWidgetEntry, isWidgetMarkdown, WidgetContent, WidgetEntry, WidgetMarkdown } from 'load/types'

export const generateClientViews = sourceTransformer({
  multiple: true,
  cfg: {},
  transformations: {
    Application(w, app) {
      return app.uses.props.map((pkguse) => {
        return pkguse.val.ref(pkguse.val.sourceRef)
      })
    },
    Package(w, pkg, { transformFile }) {
      const pkguri = pkg.uri.id.str
      pkg.views.props.forEach((v) => {
        debugger
        transformFile('app/'+pkg.uri.id.str + '/views/' + v.key.str + '.tsx', genView.make(v.val, { pkguri }))
      })
      return ''
    },
  }
})

const genView = nodeTransformer({
  View(w, v, { ws, src, cfg }) {

    src.require('ArcholView', '../../lib/archol/types', v)
    const fields = v.refs.fields
    const hasfields = fields.items.length
    const body: CodePartL[] = [
      hasfields ? [
        'const {', fields.items.map((f) => f.ref.name), '} = TODO'
      ] : '',
      ['return ', renderContent(v.content)]
    ]
    if (hasfields) 
      src.require(cfg.pkguri + '_'+ v.name.str + 'ViewInstace', '../../types', v);

    return w.statements([
      [
        'export function View' + v.name.str, w.funcDecl(
          hasfields ?
            ['{ proc }: {vars: cvv_org_br_dashboard_bemvindoInstance }'] : [],
          'ArcholView', body
        )
      ]
    ], false)
    function renderContent(content: WidgetContent): CodePartL[] {
      const ret: CodePartL[] = []
      content.widgets.items.forEach((itm) => {
        if (isWidgetContent(itm)) ret.push(renderContent(itm))
        else if (isWidgetEntry(itm)) ret.push(renderEntry(itm))
        else if (isWidgetMarkdown(itm)) ret.push(renderMarkdown(itm))
        else ws.fatal('unsupported widget', itm)
      })
      return ret
    }
    function renderEntry(entry: WidgetEntry): CodePartL {
      src.require('EntryWidget', '../../lib/components/widgets/entry', entry)
      return [
        '<EntryWidget TODOtext="x" />'
      ]
    }
    function renderMarkdown(md: WidgetMarkdown): CodePartL {
      src.require('MarkdownWidget', '../../lib/components/widgets/markdown', md)
      return [
        '<MarkdownWidget text={', md.markdown, '} />'
      ]
    }
  },
}, { pkguri: '' })
