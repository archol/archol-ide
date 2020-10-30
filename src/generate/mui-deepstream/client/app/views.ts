import { CodeLines, CodePartL } from 'generate/lib/codeWriter'
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
        transformFile('~/app/' + pkg.uri.id.str + '/views/' + v.key.str + '.tsx', genView.make(v.val, { pkguri }))
      })
      return ''
    },
  }
})

const genView = nodeTransformer({
  View(w, v, { ws, src, cfg }) {

    src.requireDefault('React', 'react', v)

    const fields = v.refs.fields
    const hasfields = fields.props.length
    const render = renderContent(v.content)
    const body: CodePartL[] = [
      ['return ', render]
    ]
    const vinst = 'T' + cfg.pkguri + '_view_' + v.name.str + 'Data'
    if (hasfields) {
      src.require('ArcholViewInstance', '~/lib/archol/types', v)
      src.require(vinst, '~/app/types', v);
    }

    return w.statements([
      [
        'export function View' + v.name.str, w.funcDecl(
          hasfields ?
            ['{ bindings }: { bindings: ArcholViewInstance<' + vinst + '> }'] : [],
          'React.ReactElement', body
        )
      ]
    ], false)

    function renderContent(content: WidgetContent): CodeLines {
      src.require('ContentWidget', '~/lib/components/widgets/content', content)
      return w.lines(
        content.widgets.items.map((itm) => {
          if (isWidgetContent(itm)) return renderContent(itm)
          else if (isWidgetEntry(itm)) return renderEntry(itm)
          else if (isWidgetMarkdown(itm)) return renderMarkdown(itm)
          throw ws.fatal('unsupported widget', itm)
        }), '<ContentWidget>', '</ContentWidget>', '')
    }
    function renderEntry(entry: WidgetEntry): CodePartL {
      src.require('EntryWidget', '~/lib/components/widgets/entry', entry)
      return [
        '<EntryWidget bindings={bindings} path=', entry.field, ' />'
      ]
    }
    function renderMarkdown(md: WidgetMarkdown): CodePartL {
      src.require('MarkdownWidget', '~/lib/components/widgets/markdown', md)
      return [
        '<MarkdownWidget text={', md.markdown, '()} />'
      ]
    }
  },
}, { pkguri: '' })
