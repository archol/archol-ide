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
        )
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
        //   task: w.mapObj(proc.tasks, (val, key) =>
        //   info.src.chip(-10, genProcessTask.make(val, { pkguri: info.cfg.pkguri, procuripref }))
        // ),          
      })]
    ], false)
  },
}, { pkguri: '' })

const genProcessInstanceType = nodeTransformer({
  Process(w, proc, info) {
    const id = 'T' + info.cfg.pkguri + '_proc_' + proc.name.str + 'Instance'
    return w.chipResult(id, [
      [
        'export interface ', id,
        w.object({
          vars: [id, 'Vars']
        })
      ],
      [
        'export interface ', id, 'Vars',
        w.object({
          local: genFields.make(proc.vars.local, {}),
          input: genFields.make(proc.vars.input, {}),
          output: genFields.make(proc.vars.output, {}),
        })
      ],
    ], false)
  },
}, { pkguri: '' })

// const genProcessTask = nodeTransformer({
//   UITask(w, task, info) {
//     const taskuripref = info.cfg.procuripref + "_task_" + task.name.str
//     // const taskrefid = taskuripref + 'Ref'
//     const taskinst = taskuripref + 'Instance'
//     // info.src.require('instanciateProcess', '~/lib/archol/process', proc)
//     // info.src.require('T' + procrefid, '~/app/types', proc)
//     // info.src.require(procinst, '~/app/types', proc)
//     return w.chipResult(taskinst, [
//       [
//         'export const ' + taskinst + ': T' + taskinst + ' = ',
//         w.object({

//         })
//       ]
//     ], false)
//   },
//   SystemTask(w, task, info) {
//     const taskuripref = info.cfg.procuripref + "_task_" + task.name.str
//     // const taskrefid = taskuripref + 'Ref'
//     const taskinst = taskuripref + 'Instance'
//     // info.src.require('instanciateProcess', '~/lib/archol/process', proc)
//     // info.src.require('T' + procrefid, '~/app/types', proc)
//     // info.src.require(procinst, '~/app/types', proc)
//     return w.chipResult(taskinst, [
//       [
//         'export const ' + taskinst + ': T' + taskinst + ' = ',
//         w.object({

//         })
//       ]
//     ], false)
//   },
// }, { pkguri: '', procuripref: '' })

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
      ['export interface ', id, 'Data', genFields.make(view.refs.fields, {})],
      ['export type ', id, 'Binder = ArcholViewBinder<', id, 'Data>'],
      ['export type ', id, 'Instance = ArcholViewInstance<', id, 'Data>']
    ], false)
  },
}, { pkguri: '' })
