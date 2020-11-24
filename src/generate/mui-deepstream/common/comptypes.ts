import { CodeLines, CodePartL, CodePartLines } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isWidgetContent, isWidgetEntry, isWidgetMarkdown, WidgetContent, WidgetEntry, WidgetMarkdown } from 'load/types'
import { genUseType } from './useType'

export const generateCompTypes = sourceTransformer({
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
      comp.types.props.forEach((v) => {
        transformFile('~/app/' + comp.uri.id.str + '/types/' + v.key.str + '.ts', genType.make(v.val, { compuri }))
      })
      return ''
    },
  }
})

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = info.cfg.compuri + '_type_' + t.name.str
    const base = t.base().base
    const validate = t.validate ? w.code(t.validate, { forceRetType: 'string | false' }) :
      w.funcDecl(['val: T' + id], 'string|false',
        [
          'return false'
        ]
      )
    const parse = t.parse ? w.code(t.parse, { forceRetType: 'T' + id + '|undefined' }) :
      w.funcDecl(['str: string | undefined'], 'T' + id + '|undefined',
        base === 'number' ? ['return str ? parseFloat(str) : undefined'] :
          ['return str']
      )
    const format = t.format ? w.code(t.format, { forceRetType: 'string' }) :
      w.funcDecl(['val: T' + id], 'string',
        base === 'number' ? ['return val ? val.toString() : ""'] :
          ['return val'])
    info.src.require('ArcholType', '~/lib/archol/types', t)
    info.src.require('T' + id, '~/app/typings', t)
    return w.statements([
      [
        'export const ', id, ': ArcholType<T',
        info.cfg.compuri, '_type_', t.name.str,
        '> = ',
        w.object({
          validate,
          parse,
          format
        })
      ]
    ], false)
  },
  EnumType(w, t, info) {
    const id = info.cfg.compuri + '_type_' + t.name.str
    info.src.require('ArcholType', '~/lib/archol/types', t)
    info.src.require('T' + id, '~/app/typings', t)
    return w.statements([
      [
        'export const ', id, ': ArcholType<T',
        id,
        '> = ',
        w.object({
          validate: w.funcDecl(['val: T' + id], 'string | false',
            t.options.props.map((o) => ['if (val===', w.string(o.key.str), ') return false'])
              .concat([
                "return 'Valor inválido'"
              ])
          ),
          parse: w.funcDecl(['str: string | undefined'], 'T' + id + '|undefined',
            t.options.props.map((o) => ['if (str===', w.string(o.key.str), ') return str'] as CodePartL).concat(
              t.options.props.map((o) => ['if (str===', o.val.description, '()) return ', o.key])
            ).concat([
              "return"
            ])),
          format: w.funcDecl(['val: T' + id], 'string',
            t.options.props.map((o) => ['if (val===', w.string(o.key.str), ') return ', o.val.description, '()'] as CodePartL).
              concat([
                "return ''"
              ])),
        })
      ]
    ], false)
  },
  ComplexType(w, t, info) {
    const id = info.cfg.compuri + '_type_' + t.name.str
    return w.statements([
      'export const TODO_', id, ' = TODO',
    ], false)
  },
  ArrayType(w, t, info) {
    const id = info.cfg.compuri + '_type_' + t.name.str
    return w.statements([
      'export const TODO_', id, ' = TODO',
    ], false)
  },
}, { compuri: '' })
