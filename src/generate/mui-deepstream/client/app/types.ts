import { strict } from 'assert'
import { scrypt } from 'crypto'
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
          src.chip(10, genProcessRef.make(val, { pkguri }))
        ),
        view: w.mapObj(pkg.views, (val, key) =>
          src.chip(20,
            genViewInstanceType.make(val, { pkguri }))
        ),
        func: w.mapObj(pkg.functions, (val, key) =>
          src.chip(30,
            genFuncInstanceType.make(val, { pkguri }))
        ),
      })]
    ], false)
  },
}, {})

const genProcessRef = nodeTransformer({
  Process(w, proc, info) {
    const procpref = info.cfg.pkguri + '_proc_' + proc.name.str
    const procDecl = 'T' + procpref + 'Decl'
    const procContent = 'T' + procpref + 'Content'
    const procInput = 'T' + procpref + 'Input'
    const procLocal = 'T' + procpref + 'Local'
    const procOutput = 'T' + procpref + 'Output'
    const procTask = 'T' + procpref + 'Task'
    const procTyping = procInput + ', ' + procLocal + ', ' + procOutput + ', ' + procTask

    info.src.require('ArcholGUID', '~/lib/archol/types', proc)
    info.src.require('AppContent', '~/lib/archol/types', proc)
    info.src.require('ProcessDecl', '~/lib/archol/process', proc)
    info.src.require('TaskDecl', '~/lib/archol/process', proc)

    return w.chipResult(procDecl, [
      ['export interface ', procInput, genFieldsWithBase.make(proc.vars.input, {})],
      ['export interface ', procLocal, genFieldsWithBase.make(proc.vars.local, {})],
      ['export interface ', procOutput, genFieldsWithBase.make(proc.vars.output, {})],
      ['export interface ', procTask, w.mapObj(proc.tasks, (v, k) => {
        const taskdecl = 'T' + procpref + '_task_' + k.str + 'Decl'
        info.src.chip(11, [
          ['export type ' + taskdecl, ' = ', 'TaskDecl<', procTyping, ', ', k, '>']
        ], false)
        return taskdecl
      })],
      ['export type ' + procDecl, ' = ProcessDecl<', procTyping, '>'],
      //      ['export type ', procContent, ' = AppContent<', procTyping, '>'],
    ], false)
  },
  UITask(w, task, info) {
    info.src.require('TaskDecl', '~/lib/archol/process', task)

    // const usedView = task.useView.ref(task)
    // const usedViewData = 'T' + info.cfg.pkguri + '_view_' + usedView.name.str + 'Data'

    return ['TaskDecl']
  },
  SystemTask(w, task, info) {
    info.src.require('TaskDecl', '~/lib/archol/process', task)
    return ['TaskDecl']
  },
}, { pkguri: '' })

const genProcessInstanceTypeX = nodeTransformer({
  Process(w, proc, info) {
    const procpref = 'T' + info.cfg.pkguri + '_proc_' + proc.name.str
    const id = procpref + 'Instance'
    info.src.require('ProcesInstance', '~/lib/archol/process', proc)
    return w.chipResult(id, [
      // [
      //   'export interface ', id,
      //   w.object({
      //     packageId: w.string(info.cfg.pkguri),
      //     processId: w.string(proc.name.str),
      //     instanceId: info.src.require('ArcholGUID', '~/lib/archol/types', proc),
      //     vars: [id, 'Vars']
      //   })
      // ],

    ], false)
  },
}, { pkguri: '' })

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = 'T' + info.cfg.pkguri + '_type_' + t.name.str
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
    info.src.require('SingletonBinder', '~/lib/archol/singleton', view)
    info.src.require('SingletonBinding', '~/lib/archol/singleton', view)

    const id = 'T' + info.cfg.pkguri + '_view_' + view.name.str
    return w.chipResult(id + 'Binder', [
      ['export interface ', id, 'Data', genFieldsWithBase.make(view.refs.fields, {})],
      ['export type ', id, 'Binder = SingletonBinder<', id, 'Data>'],
      ['export type ', id, 'Instance = SingletonBinding<', id, 'Data>']
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
