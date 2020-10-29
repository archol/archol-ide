import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateClientApp = sourceTransformer({
  filePath: '~/app/app.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      src.require('contentDoc', '~/docs/app/content', app)
      return w.statements([
        ['export const appInstance = ', app.uses],
        ['export const ' + app.name.str + '=appInstance'],
      ], false)
    },
    PackageUses(w, pkgs) {
      return [w.mapObj(pkgs, (val, key) => val)]
    },
    PackageUse(w, pkg, { src }) {
      const pkguri = pkg.ref(pkg).uri.id.str
      return src.chip(-1, genPkgRef.make(pkg.ref(pkg), { pkguri }))
    },
  },
})

const genPkgRef = nodeTransformer({
  Package(w, pkg, { src }) {
    const pkguri = pkg.uri.id.str
    return w.chipResult(pkguri + 'Instance', [
      [
        'export const ', pkguri, 'Instance = ',
        w.object({
          types: w.mapObj(pkg.types, (val, key) =>
            src.chip(
              -1000,
              genType.make(val, { pkguri })
            )
          ),
          process: w.mapObj(pkg.processes, (val, key) =>
            src.chip(-10, genProcess.make(val, { pkguri }))
          ),
          func: w.mapObj(pkg.functions, (val, key) =>
            src.chip(-10, genFunction.make(val, { pkguri }))
          ),
          // view: w.mapObj(pkg.views, (val, key) =>
          //   src.chip(-10, genViewInstanceType.make(val, { pkguri }))
          // )
        })
      ]
    ], false)
  },
}, {})

const genProcess = nodeTransformer({
  Process(w, proc, info) {
    const procuripref = info.cfg.pkguri + '_proc_' + proc.name.str
    const procrefid = procuripref + 'Ref'
    const procinst = 'T' + procuripref + 'Instance'
    info.src.require('instanciateProcess', '~/lib/archol/process', proc)
    info.src.require('T' + procrefid, '~/app/types', proc)
    info.src.require(procinst, '~/app/types', proc)
    return w.chipResult(procrefid, [
      [
        'export const ' + procrefid + ': T' + procrefid + ' = ',
        w.object({
          start: w.funcDecl(proc.vars.input.props
            .map((v) => v.key.str + ':' + v.val.type.base(v.val)), '', [
            [
              'return instanciateProcess<', procinst, '>(',
              [w.string(info.cfg.pkguri + '.' + proc.name.str)]
                .concat(
                  proc.vars.input.props.map((v) => v.key.str)).join(','),
              ')'
            ]
          ]),
          task: w.mapObj(proc.tasks, (val, key) =>
            info.src.chip(-10, genProcessTask.make(val, { pkguri: info.cfg.pkguri, procname: proc.name.str }))
          ),
        })
      ]
    ], false)
  },
}, { pkguri: '' })

const genProcessTask = nodeTransformer({
  UITask(w, task, info) {
    const procuripref = info.cfg.pkguri + '_proc_' + info.cfg.procname
    const taskuripref = procuripref + "_task_" + task.name.str
    const taskrefid = taskuripref + 'Ref'
    const usedView = task.useView.ref(task)
    const hasfields = usedView.refs.fields.props.length
    const usedViewId = 'View' + usedView.name.str
    const usedViewData = 'T' + info.cfg.pkguri + '_view_' + usedView.name.str + 'Data'
    info.src.requireDefault('React', 'react', task)
    info.src.require('TUITaskRef', '~/lib/archol/process', task)
    info.src.require('getProcessVarsDoc', '~/lib/archol/process', task)
    info.src.require('archolDocBinding', '~/lib/archol/process', task)
    info.src.require('ArcholDocumentState', '~/lib/archol/types', task)
    info.src.require('ArcholViewInstance', '~/lib/archol/types', task)
    info.src.require('T' + procuripref + 'Instance', '~/app/types', task)
    info.src.require('T' + procuripref + 'InstanceVars', '~/app/types', task)
    info.src.require(usedViewData, '~/app/types', task)
    info.src.require(usedViewId, '~/app/' + info.cfg.pkguri + '/views/' + usedView.name.str, task)
    return w.chipResult(taskrefid, [
      [
        ['export const ', taskrefid, ': TUITaskRef = '],
        w.object({
          packageId: w.string(info.cfg.pkguri),
          processId: w.string(info.cfg.procname),
          taskId: w.string(task.name.str),
          getInstance: w.funcDecl(['processInstanceId'], '', [
            ['const packageId = ', w.string(info.cfg.pkguri)],
            ['const processId = ', w.string(info.cfg.procname)],
            ['const taskId = ', w.string(task.name.str)],
            hasfields ?
              ['const doc = getProcessVarsDoc<', 'T' + procuripref + 'InstanceVars', '>(packageId, processId, taskId, processInstanceId)']
              : ['const doc: ArcholDocumentState<', 'T' + procuripref + 'InstanceVars> = undefined as any'],
            hasfields ?
              ['const bindings: ArcholViewInstance<', usedViewData, '>', ' = ', 'archolDocBinding(doc, ', task.useView.bind, ')']
              : [],
            ['const view = ', w.funcDecl([''], '', [
              hasfields ?
                ['return <', usedViewId, ' bindings={bindings} />',]
                : ['return <', usedViewId, ' />',]
            ], { arrow: true })],
            [
              'const self = ', w.object({
                packageId: '',
                processId: '',
                taskId: '',
                processInstanceId: '',
                view: ''
              })
            ],
            'return self'
          ])
        })
      ]
    ], false)
  },
  BindVars(w, vars) {
    return w.mapObj(vars, (v) => {
      return v.fieldpath
    })
  },
  SystemTask(w, task, info) {
    const procuripref = info.cfg.pkguri + '_proc_' + info.cfg.procname
    const taskuripref = procuripref + "_task_" + task.name.str
    const taskrefid = taskuripref + 'Ref'
    const usedFunc = task.useFunction.ref(task)
    const usedFuncId = 'Function' + usedFunc.name.str
    const usedFuncInput = 'T' + info.cfg.pkguri + '_func_' + usedFunc.name.str + 'Input'
    const usedFuncOutput = 'T' + info.cfg.pkguri + '_func_' + usedFunc.name.str + 'Output'

    info.src.requireDefault('React', 'react', task)
    info.src.require('TSystemTaskRef', '~/lib/archol/process', task)
    info.src.require('copyVarsFromDoc', '~/lib/archol/process', task)
    info.src.require('copyVarsToDoc', '~/lib/archol/process', task)
    info.src.require(usedFuncInput, '~/app/types', task)
    info.src.require(usedFuncOutput, '~/app/types', task)

    return w.chipResult(taskrefid, [
      [
        ['export const ', taskrefid, ': TSystemTaskRef<', usedFuncOutput, '> = '],
        w.object({
          packageId: w.string(info.cfg.pkguri),
          processId: w.string(info.cfg.procname),
          taskId: w.string(task.name.str),
          exec: w.funcDecl(['processInstanceId'], '', [
            ['const packageId = ', w.string(info.cfg.pkguri)],
            ['const processId = ', w.string(info.cfg.procname)],
            ['const taskId = ', w.string(task.name.str)],
            ['const doc = getProcessVarsDoc<', 'T' + procuripref + 'InstanceVars', '>(packageId, processId, taskId, processInstanceId)'],
            [
              'const input = copyVarsFromDoc<' + usedFuncInput + '>(doc,', task.useFunction.input, ' )'
            ],
            ['const output = executeFunction<' + usedFuncInput + ', ' + usedFuncOutput + '>(input)'],
            ['const result = await output.result'],
            ['copyVarsToDoc(result, doc, ', task.useFunction.output, ' )'],
            ['return result']
          ], { async: true })
        })
      ]
    ], false)
  },
}, { pkguri: '', procname: '' })

const genFunction = nodeTransformer({
  Function(w, f, { ws, src, cfg }) {


    const body: CodePartL[] = [
      ['return executeFunction(input)']
    ]
    const fid = 'T' + cfg.pkguri + '_func_' + f.name.str
    src.require('FunctionContext', '~/lib/archol/functions', f)
    src.require('executeFunction', '~/lib/archol/functions', f)
    src.require(fid + 'Exec', '~/app/types', f);
    src.require(fid + 'Output', '~/app/types', f);
    src.require(fid + 'Output', '~/app/types', f);

    return w.chipResult(fid + 'Exec', [
      [
        'export function ', fid + 'Exec', w.funcDecl([
          'input: ' + fid + 'Input'
        ], 'FunctionContext<' + fid + 'Output>', body
        )
      ]
    ], false)
  },
}, { pkguri: '' })

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = info.cfg.pkguri + '_base_' + t.name.str
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
    info.src.require('T' + id, '~/app/types', t)
    return w.chipResult(id, [
      [
        'export const ', id, ': ArcholType<T',
        info.cfg.pkguri, '_base_', t.name.str,
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
    const id = info.cfg.pkguri + '_enum_' + t.name.str
    info.src.require('ArcholType', '~/lib/archol/types', t)
    info.src.require('T' + id, '~/app/types', t)
    return w.chipResult(id, [
      [
        'export const ', id, ': ArcholType<T',
        info.cfg.pkguri, '_enum_', t.name.str,
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
    const id = info.cfg.pkguri + '_complex_' + t.name.str
    return w.chipResult(id, [
      'export const TODO_', info.cfg.pkguri, '_complex_', t.name.str, ' = TODO',
    ], false)
  },
  ArrayType(w, t, info) {
    const id = info.cfg.pkguri + '_array_' + t.name.str
    return w.chipResult(id, [
      'export const TODO_', info.cfg.pkguri, '_arr_', t.name.str, ' = TODO',
    ], false)
  },
}, { pkguri: '' })

// const genViewInstanceType = nodeTransformer({
//   View(w, view, info) {
//     const viewuri = info.cfg.pkguri + '_view_' + view.name.str
//     info.src.require('ArcholViewInstance', '~/lib/archol/types', view)
//     info.src.require('T' + viewuri + 'Binder', '~/app/types', view)
//     return w.chipResult(viewuri + 'Binder', [
//       [
//         'export function ' + viewuri + 'Binder',
//         w.funcDecl(['from: any', 'to: any'], 'T' + viewuri + 'Binder', [
//           'return'
//         ])
//       ]
//     ], false)
//   },
// }, { pkguri: '' })

/*
cadastro/telaBadosBasicos
  cof, nome, email

            bind: {
              cpf: 'input.cpf',
              nome: 'local.nome',
              email: 'local.email',
            }
*/