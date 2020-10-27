import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFields } from './fields'

export const generateClientTypes = sourceTransformer({
  filePath: 'app/types.ts',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        ['export interface AppRef ', app.uses],
      ], false)
    },
    PackageUses(w, pkgs) {
      return [w.mapObj(pkgs, (val, key) => val)]
    },
    PackageUse(w, pkg, { src }) {
      const pkguri = pkg.ref(pkg).uri.id.str
      return src.chip(pkguri + 'Ref', pkg, () => genPkgRef.make(pkg, { pkguri }))
    },
  },
})

const genPkgRef = nodeTransformer({
  PackageUses(w, pkgs) {
    return w.statements(pkgs.props, false)
  },
  PackageUse(w, pkg) {
    return pkg.ref(pkg)
  },
  Package(w, pkg, { src }) {
    const pkguri = pkg.uri.id.str
    pkg.types.props.forEach(t => src.chip(
      '', t.val, () => genType.make(t.val, { pkguri }))
    )
    return [
      'export interface ', pkguri, 'Ref',
      w.object({
        process: w.mapObj(pkg.processes, (val, key) =>
          src.chip(pkguri + '_proc_' + key.str + 'Ref', pkg, () => genProcessRefTypes.make(val, { pkguri }))
        ),
        view: w.mapObj(pkg.views, (val, key) =>
          src.chip(pkguri + '_view_' + key.str + 'Instance', pkg, () => genViewInstanceType.make(val, { pkguri }))
        )
      })
    ]
  },
}, {})

const genProcessRefTypes = nodeTransformer({
  Process(w, proc, info) {
    const procuri = info.cfg.pkguri + '_proc_' + proc.name.str
    info.src.chip(procuri + 'Instance', proc, () => genProcessInstanceType.make(proc, { procuri }))
    return [
      'export interface ' + procuri + 'Ref',
      w.object({
        start: w.funcDecl([], procuri + 'Instance', null)
      })
    ]
  },
}, { pkguri: '' })

const genProcessInstanceType = nodeTransformer({
  Process(w, proc, info) {
    return w.statements([
      [
        'export interface ', info.cfg.procuri, 'Instance',
        w.object({
          vars: [info.cfg.procuri, 'InstanceVars']
        })
      ],
      [
        'export interface ', info.cfg.procuri, 'InstanceVars',
        w.object({
          local: genFields.make(proc.vars.local, {}),
          input: genFields.make(proc.vars.input, {}),
          output: genFields.make(proc.vars.output, {}),
        })
      ],
    ], false)
  },
}, { procuri: '' })

const genType = nodeTransformer({
  NormalType() {
    return ""
  },
  EnumType(w, t, info) {
    return [
      'export type ', info.cfg.pkguri, '_enum_', t.name.str, ' = ',
      t.options.props.map((o) => w.string(o.key.str)).join(' | ')
    ]
  },
  ComplexType(w, t, info) {
    return [
      'export type TODO_', info.cfg.pkguri, '_complex_', t.name.str, ' = TODO',
    ]
  },
  ArrayType(w, t, info) {
    return [
      'export type TODO_', info.cfg.pkguri, '_arr_', t.name.str, ' = TODO',
    ]
  },
}, { pkguri: '' })

const genViewInstanceType = nodeTransformer({
  View(w, view, info) {
    info.src.require('ArcholVars', '../../../lib/archol/types', view)
    const viewuri = info.cfg.pkguri + '_view_' + view.name.str
    return [
      'export interface ' + viewuri + 'Instance',
      w.object({
        vars: ['ArcholVars<',genFields.make(view.refs.fields, {}), '>']        
      })
    ]
  },
}, { pkguri: '' })
