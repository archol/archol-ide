import { strict } from 'assert'
import { scrypt } from 'crypto'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFieldsWithBase, genFieldsWithType } from './fields'

export const generateClientTypings = sourceTransformer({
  filePath: '~/app/typings.ts',
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
    ComponentUses(w, comps) {
      return [w.mapObj(comps, (val, key) => val)]
    },
    ComponentUse(w, comp, { src }) {
      return src.chip(1, genCompRef.make(comp.ref(comp), {}))
    },
  },
})

const genCompRef = nodeTransformer({
  Component(w, comp, { src }) {
    const compuri = comp.uri.id.str
    comp.types.props.forEach(t => src.chip(
      1,
      genType.make(t.val, { compuri })) && ''
    )
    const id = 'T' + compuri + 'Ref'
    return w.chipResult(id, [
      ['export interface ' + id,
      w.object({
        process: w.mapObj(comp.processes, (val, key) =>
          src.chip(10, genProcessRef.make(val, { compuri }))
        ),
        view: w.mapObj(comp.views, (val, key) =>
          src.chip(20,
            genViewInstanceType.make(val, { compuri }))
        ),
        operation: w.mapObj(comp.operations, (val, key) =>
          src.chip(30,
            genOpInstanceType.make(val, { compuri }))
        ),
      })]
    ], false)
  },
}, {})

const genProcessRef = nodeTransformer({
  Process(w, proc, info) {
    const procpref = info.cfg.compuri + '_proc_' + proc.name.str
    const procDecl = 'T' + procpref + 'Decl'
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
    ], false)
  },
  UITask(w, task, info) {
    info.src.require('TaskDecl', '~/lib/archol/process', task)

    // const usedView = task.useView.ref(task)
    // const usedViewData = 'T' + info.cfg.compuri + '_view_' + usedView.name.str + 'Data'

    return ['TaskDecl']
  },
  SystemTask(w, task, info) {
    info.src.require('TaskDecl', '~/lib/archol/process', task)
    return ['TaskDecl']
  },
}, { compuri: '' })

const genProcessInstanceTypeX = nodeTransformer({
  Process(w, proc, info) {
    const procpref = 'T' + info.cfg.compuri + '_proc_' + proc.name.str
    const id = procpref + 'Instance'
    info.src.require('ProcesInstance', '~/lib/archol/process', proc)
    return w.chipResult(id, [
      // [
      //   'export interface ', id,
      //   w.object({
      //     componentId: w.string(info.cfg.compuri),
      //     processId: w.string(proc.name.str),
      //     instanceId: info.src.require('ArcholGUID', '~/lib/archol/types', proc),
      //     vars: [id, 'Vars']
      //   })
      // ],

    ], false)
  },
}, { compuri: '' })

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.base().base
      ]
    ], false)
  },
  EnumType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.options.props.map((o) => w.string(o.key.str)).join(' | ')
      ]
    ], false)
  },
  ComplexType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, t.name.str, ' = TODO',
      ]
    ], false)
  },
  ArrayType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      'export type ', id, ' = TODO',
    ], false)
  },
}, { compuri: '' })

const genViewInstanceType = nodeTransformer({
  View(w, view, info) {
    info.src.require('SingletonBinder', '~/lib/archol/singleton', view)
    info.src.require('SingletonBinding', '~/lib/archol/singleton', view)

    const id = 'T' + info.cfg.compuri + '_view_' + view.name.str
    return w.chipResult(id + 'Binder', [
      ['export interface ', id, 'Data', genFieldsWithBase.make(view.refs.fields, {})],
      ['export type ', id, 'Binder = SingletonBinder<', id, 'Data>'],
      ['export type ', id, 'Instance = SingletonBinding<', id, 'Data>']
    ], false)
  },
}, { compuri: '' })

const genOpInstanceType = nodeTransformer({
  Operation(w, op, info) {
    const id = 'T' + info.cfg.compuri + '_operation_' + op.name.str
    info.src.require('OperationContext', '~/lib/archol/operations', op)
    return w.chipResult(id + 'Exec', [
      ['export interface ', id, 'Input', genFieldsWithType.make(op.input, {})],
      ['export interface ', id, 'Output', genFieldsWithType.make(op.output, {})],
      ['export type ', id, 'Exec = ( input: ', id, 'Input ) => OperationContext<', id, 'Output>'],
    ], false)
  },
}, { compuri: '' })
