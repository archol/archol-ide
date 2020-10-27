import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFields } from './fields'

export const generateClientTypes = sourceTransformer({
  filePath: '~/app/types.ts',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        ['export interface AppRef ', app.uses],
        'export type Tstring=string',
        'export type Tnumber=number',
        'export type Tboolean=boolean',
        'export type Tdate=number',
      ], false)
    },
    PackageUses(w, pkgs) {
      return [w.mapObj(pkgs, (val, key) => val)]
    },
    PackageUse(w, pkg, { src }) {
      const pkguri = pkg.ref(pkg).uri.id.str
      return src.chip('T' + pkguri + 'Ref', pkg, 1, () => genPkgRef.make(pkg, { pkguri }))
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
      '', t.val, 1,
      () => genType.make(t.val, { pkguri }))
    )
    return [
      'export interface T', pkguri, 'Ref',
      w.object({
        process: w.mapObj(pkg.processes, (val, key) =>
          src.chip('T' + pkguri + '_proc_' + key.str + 'Ref', pkg, 1, () => genProcessRefTypes.make(val, { pkguri }))
        ),
        view: w.mapObj(pkg.views, (val, key) =>
          src.chip('T' + pkguri + '_view_' + key.str + 'Instance', pkg, 1, () => genViewInstanceType.make(val, { pkguri }))
        )
      })
    ]
  },
}, {})

const genProcessRefTypes = nodeTransformer({
  Process(w, proc, info) {
    const procuri = info.cfg.pkguri + '_proc_' + proc.name.str
    info.src.chip('T' + procuri + 'Instance', proc, 1, () => genProcessInstanceType.make(proc, { procuri }))
    return [
      'export interface T' + procuri + 'Ref',
      w.object({
        start: w.funcDecl(proc.vars.input.props
          .map((v) => v.key.str + ':' + v.val.type.base(v.val)), 'T' + procuri + 'Instance', null)
      })
    ]
  },
}, { pkguri: '' })

const genProcessInstanceType = nodeTransformer({
  Process(w, proc, info) {
    return w.statements([
      [
        'export interface T', info.cfg.procuri, 'Instance',
        w.object({
          vars: ['T', info.cfg.procuri, 'InstanceVars']
        })
      ],
      [
        'export interface T', info.cfg.procuri, 'InstanceVars',
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
      'export type T', info.cfg.pkguri, '_enum_', t.name.str, ' = ',
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
    info.src.require('ArcholVars', '~/lib/archol/types', view)
    const viewuri = info.cfg.pkguri + '_view_' + view.name.str
    return [
      'export interface T' + viewuri + 'Instance',
      w.object({
        vars: ['ArcholVars<', genFields.make(view.refs.fields, {}), '>']
      })
    ]
  },
}, { pkguri: '' })
