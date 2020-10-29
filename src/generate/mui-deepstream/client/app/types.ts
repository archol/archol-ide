import { strict } from 'assert'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFieldsWithBase, genFieldsWithType } from './fields'

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
      return src.chip(1, genPkgRef.make(pkg.ref(pkg), {}))
    },
  },
})

const genPkgRef = nodeTransformer({
  Package(w, pkg, { src }) {
    const pkguri = pkg.uri.id.str
    pkg.types.props.forEach(t => src.chip(
      1,
      genType.make(t.val, { pkguri })) && ''
    )
    const id = 'T' + pkguri + 'Ref'
    return w.chipResult(id, [
      ['export interface ' + id,
      w.object({
        process: w.mapObj(pkg.processes, (val, key) =>
          src.chip(1, genProcessRef.make(val, { pkguri }))
        ),
        view: w.mapObj(pkg.views, (val, key) =>
          src.chip(1,
            genViewInstanceType.make(val, { pkguri }))
        ),
        func: w.mapObj(pkg.functions, (val, key) =>
          src.chip(1,
            genFuncInstanceType.make(val, { pkguri }))
        ),
      })]
    ], false)
  },
}, {})

const genProcessRef = nodeTransformer({
  Process(w, proc, info) {
    const procuripref = info.cfg.pkguri + '_proc_' + proc.name.str
    const id = 'T' + procuripref + 'Ref'

    const inst = info.src.chip(1, genProcessInstanceType.make(proc, { pkguri: info.cfg.pkguri }))

    return w.chipResult(id, [
      ['export interface ' + id,
      w.object({
        start: w.funcDecl(proc.vars.input.props
          .map((v) => v.key.str + ':' + v.val.type.base(v.val)), inst.id, null),
        task: w.mapObj(proc.tasks, (val, key) => val),
      })]
    ], false)
  },
  UITask(w, task, info) {
    info.src.require('TUITaskRef', '~/lib/archol/process', task)
    return ['TUITaskRef']
  },
  SystemTask(w, task, info) {
    const usedfunc = 'T' + info.cfg.pkguri + '_func_' + task.useFunction.function.str
    info.src.require('TSystemTaskRef', '~/lib/archol/process', task)
    return ['TSystemTaskRef<', usedfunc, 'Output>']
  },
}, { pkguri: '' })

const genProcessInstanceType = nodeTransformer({
  Process(w, proc, info) {
    const id = 'T' + info.cfg.pkguri + '_proc_' + proc.name.str + 'Instance'
    return w.chipResult(id, [
      [
        'export interface ', id,
        w.object({
          instanceId: 'string',
          vars: [id, 'Vars']
        })
      ],
      [
        'export interface ', id, 'Vars',
        w.object({
          local: genFieldsWithBase.make(proc.vars.local, {}),
          input: genFieldsWithBase.make(proc.vars.input, {}),
          output: genFieldsWithBase.make(proc.vars.output, {}),
        })
      ],
    ], false)
  },
}, { pkguri: '' })

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = 'T' + info.cfg.pkguri + '_base_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.base().base
      ]
    ], false)
  },
  EnumType(w, t, info) {
    const id = 'T' + info.cfg.pkguri + '_enum_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.options.props.map((o) => w.string(o.key.str)).join(' | ')
      ]
    ], false)
  },
  ComplexType(w, t, info) {
    const id = 'T' + info.cfg.pkguri + '_complex_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, t.name.str, ' = TODO',
      ]
    ], false)
  },
  ArrayType(w, t, info) {
    const id = 'T' + info.cfg.pkguri + '_array_' + t.name.str
    return w.chipResult(id, [
      'export type ', id, ' = TODO',
    ], false)
  },
}, { pkguri: '' })

const genViewInstanceType = nodeTransformer({
  View(w, view, info) {
    info.src.require('ArcholViewBinder', '~/lib/archol/types', view)
    info.src.require('ArcholViewInstance', '~/lib/archol/types', view)
    const id = 'T' + info.cfg.pkguri + '_view_' + view.name.str
    return w.chipResult(id + 'Binder', [
      ['export interface ', id, 'Data', genFieldsWithBase.make(view.refs.fields, {})],
      ['export type ', id, 'Binder = ArcholViewBinder<', id, 'Data>'],
      ['export type ', id, 'Instance = ArcholViewInstance<', id, 'Data>']
    ], false)
  },
}, { pkguri: '' })

const genFuncInstanceType = nodeTransformer({
  Function(w, func, info) {
    const id = 'T' + info.cfg.pkguri + '_func_' + func.name.str
    info.src.require('FunctionContext', '~/lib/archol/functions', func)
    return w.chipResult(id + 'Exec', [
      ['export interface ', id, 'Input', genFieldsWithType.make(func.input, {})],
      ['export interface ', id, 'Output', genFieldsWithType.make(func.output, {})],
      ['export type ', id, 'Exec = ( input: ', id, 'Input ) => FunctionContext<', id, 'Output>'],
    ], false)
  },
}, { pkguri: '' })
