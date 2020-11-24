import { CodeLines, CodePartL, CodePartLines } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isWidgetContent, isWidgetEntry, isWidgetMarkdown, WidgetContent, WidgetEntry, WidgetMarkdown } from 'load/types'
import { genUseType } from '../../common/useType'

export const generateClientCompViews = sourceTransformer({
  multiple: true,
  cfg: {},
  transformations: {
    Application(w, app) {
      return app.uses.props.map((compuse) => {
        return compuse.val.ref(compuse.val.sourceRef)
      })
    },
    Component(w, comp, { transformFile }) {
      const compuri = comp.uri.id.str
      comp.views.props.forEach((v) => {
        transformFile('~/app/' + comp.uri.id.str + '/views/' + v.key.str + '.tsx', genView.make(v.val, { compuri }))
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
    const vinst = 'T' + cfg.compuri + '_view_' + v.name.str + 'Data'
    const body: CodePartLines = [
      hasfields ? 'const content: AppContent<any, any, any, any, ' + vinst + '> = contentPub.use()' : null,
      // hasfields ? 'const bindings = content.bindings' : null,
      ['return ', render]
    ]
    if (hasfields) {
      src.require('contentPub', '~/rx/app/content', v)
      src.require('AppContent', '~/lib/archol/types', v)
      src.require(vinst, '~/app/typings', v);
    }

    return w.statements([
      [
        'export function View' + v.name.str, w.funcDecl([], 'React.ReactElement', body)
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
        '<EntryWidget',
        ' content={content}',
        ' path=', entry.field,
        ' caption={', entry.caption, '()}',
        ' type={', entry.type, '}',
        ' />'
      ]
    }
    function renderMarkdown(md: WidgetMarkdown): CodePartL {
      src.require('MarkdownWidget', '~/lib/components/widgets/markdown', md)
      return [
        '<MarkdownWidget text={', md.markdown, '()} />'
      ]
    }
  },
  ...genUseType.transformerFactory
}, { compuri: '' })
