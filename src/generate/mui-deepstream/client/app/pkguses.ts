import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { propByPathTransverser } from 'generate/lib/transverses/propByPathTransverser'
import { withPathTransverser } from 'generate/lib/transverses/withPathTransverser'
import { isCodeNode } from 'load/types'

export const generatePkgUses = nodeTransformer({
  PackageUses(w, pkgs, { src }) {
    return [w.mapObj(pkgs, (pkg, key) => {
      const pkguri = pkg.ref(pkg).uri.id.str
      src.require(pkguri + 'Instance', '~/app/' + pkguri + '/' + pkguri, pkg)
      return pkg
    })]
  },
  PackageUse(w, pkg, { transformFile, src, ws, fileIsEmpty }) {
    const pkguri = pkg.ref(pkg).uri.id.str
    const pkgsource = '~/app/' + pkguri + '/' + pkguri
    if (fileIsEmpty(pkgsource))
      transformFile(pkgsource + '.tsx', genPkgRef.make(pkg.ref(pkg), { pkguri }))
    return pkguri + 'Instance'
  },
}, {})

const genPkgRef = nodeTransformer({
  Package(w, pkg, { src }) {
    const pkguri = pkg.uri.id.str
    return w.statements([
      [
        'export const ', pkguri, 'Instance = ',
        w.object({
          type: w.mapObj(pkg.types, (val) => {
            const id = pkguri + '_type_' + val.name.str
            src.require(id, '~/app/' + pkguri + '/types/' + val.name.str + '.tsx', val)
            return id
          }),
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
    const procrefid = procuripref + 'Decl'
    const storage = proc.volatile.bool ? 'volatileStorage' : 'remoteStorage'
    info.src.require('ArcholGUID', '~/lib/archol/types', proc)
    info.src.require('instanciateProcess', '~/lib/archol/process', proc)
    info.src.require('openProcessInstance', '~/lib/archol/process', proc)
    info.src.require('T' + procrefid, '~/app/typings', proc)
    info.src.require('T' + procuripref + 'Input', '~/app/typings', proc)
    info.src.require('T' + procuripref + 'Local', '~/app/typings', proc)
    info.src.require('T' + procuripref + 'Output', '~/app/typings', proc)
    info.src.require('T' + procuripref + 'Task', '~/app/typings', proc)
    info.src.require(storage, '~/lib/archol/storage', proc)
    info.src.require('contentPub', '~/rx/app/content', proc)
    return w.chipResult(procrefid, [
      [
        'export const ' + procrefid + ': T' + procrefid + ' = ',
        w.object({
          // packageId: w.string(info.cfg.pkguri),
          // processId: w.string(proc.name.str),
          uri: [w.string(info.cfg.pkguri + '_' + proc.name.str) + ' as ArcholGUID'],
          start: w.string(proc.start.task.str) + ' as ArcholGUID',
          instanciate: w.funcDecl(['input: T' + procuripref + 'Input'], '', [
            [
              'const content=await instanciateProcess(',
              procuripref, 'Decl, ', storage, ', input',
              ')'
            ],
            'contentPub.show(content)',
            'return content'
          ], { async: true }),
          open: w.funcDecl(['processInstanceId: ArcholGUID'], '', [
            [
              'const content=await openProcessInstance(',
              procuripref, 'Decl, processInstanceId, ',
              storage,
              ')'
            ],
            'contentPub.show(content)',
            'return content'
          ], { async: true }),
          tasks: w.mapObj(proc.tasks, (val, key) =>
            info.src.chip(-10, genProcessTask.make(val, {
              pkguri: info.cfg.pkguri,
              procname: proc.name.str,
              storage
            }))
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
    const taskdecl = taskuripref + 'Decl'
    const usedView = task.useView.ref(task)
    const hasfields = usedView.refs.fields.props.length
    const usedViewId = 'View' + usedView.name.str
    const usedViewInst = 'T' + info.cfg.pkguri + '_view_' + usedView.name.str + 'Instance'
    const usedViewData = 'T' + info.cfg.pkguri + '_view_' + usedView.name.str + 'Data'
    const storage = info.cfg.storage
    const procInput = 'T' + procuripref + 'Input'
    const procLocal = 'T' + procuripref + 'Local'
    const procOutput = 'T' + procuripref + 'Output'
    const procTask = 'T' + procuripref + 'Task'
    const procTyping = procInput + ', ' + procLocal + ', ' + procOutput + ', ' + procTask
    info.src.requireDefault('React', 'react', task)
    // info.src.require('TaskDecl', '~/lib/archol/process', task)
    if (hasfields) {
      info.src.require('bindSingleton', '~/lib/archol/singleton', task)
      info.src.require(info.cfg.storage, '~/lib/archol/storage', task)
    }
    info.src.require(procInput, '~/app/typings', task)
    info.src.require(procLocal, '~/app/typings', task)
    info.src.require(procOutput, '~/app/typings', task)

    info.src.require('ArcholGUID', '~/lib/archol/types', task)
    info.src.require('AppContent', '~/lib/archol/types', task)
    info.src.require(usedViewInst, '~/app/typings', task)
    info.src.require(usedViewData, '~/app/typings', task)
    info.src.require('T' + taskdecl, '~/app/typings', task)
    info.src.require(usedViewId, '~/app/' + info.cfg.pkguri + '/views/' + usedView.name.str, task)
    return w.chipResult(taskdecl, [
      [
        ['export const ', taskdecl, ': T', taskdecl, ' = '],
        w.object({
          task: w.string(task.name.str),
          next: task.next,
          getContent: w.funcDecl(['varsPub'], '', [
            // ['const packageId = ', w.string(info.cfg.pkguri)],
            // ['const processId = ', w.string(info.cfg.procname)],
            // ['const taskId = ', w.string(task.name.str)],
            // hasfields ?
            //   ['const varsPub = getProcessVars(', procuripref, 'Decl, processInstanceId, ',
            //     info.cfg.storage, ')']
            //   : null,
            // hasfields ?
            //   ['const vars = proxifySingleton(varsPub)']
            //   : null,
            hasfields ?
              ['const bindings = ', 'bindSingleton<', usedViewData, '>(varsPub, ', task.useView.bind, ')']
              : null,
            [
              'const content: AppContent<' + procTyping + ', ' + usedViewInst + '> = ', w.object({
                uid: w.string(taskuripref),
                varsPub: '',
                task: w.string(task.name.str),
                view: usedViewId,
                search: 'null as any',
                title: isCodeNode(usedView.title) ?
                  (() => {
                    if (usedView.title.params.length !== 1) throw info.ws.fatal('title como função exige param vars', usedView.title)
                    return w.code(usedView.title, {
                      traversals: [
                        withPathTransverser(usedView.title.params[0].getName(), 'get', undefined)
                      ],
                      // forceParams: [],
                      forceParams: [usedView.title.params[0].getName() + ' : ' + usedViewInst],
                      // before: [
                      //   ['const ', usedView.title.params[0].getName(), ' = bindings.useProxy()']
                      // ]
                      // () {
                      //   forceParamType(param, idx) {
                      //     if (idx === 0) return usedViewData
                      //   }
                      // }
                    })
                  })() : usedView.title,
                bindings: hasfields ? '' : 'null as any',
                modify: 'varsPub.modify',
              })
            ],
            'return content'
          ]),
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
    const taskrefid = taskuripref + 'Decl'
    const usedFunc = task.useFunction.ref(task)
    const usedFuncId = 'Function' + usedFunc.name.str
    const usedFuncInput = 'T' + info.cfg.pkguri + '_func_' + usedFunc.name.str + 'Input'
    const usedFuncOutput = 'T' + info.cfg.pkguri + '_func_' + usedFunc.name.str + 'Output'
    const procInput = 'T' + procuripref + 'Input'
    const procLocal = 'T' + procuripref + 'Local'
    const procOutput = 'T' + procuripref + 'Output'
    const procTask = 'T' + procuripref + 'Task'
    const procTyping = procInput + ', ' + procLocal + ', ' + procOutput + ', ' + procTask

    info.src.requireDefault('React', 'react', task)
    info.src.require('getExecutionContext', '~/lib/archol/functions', task)
    info.src.require('ExecuteFunctionRenderer', '~/layout/app/executeFunctionRenderer', task)
    info.src.require('ArcholGUID', '~/lib/archol/types', task)
    info.src.require(usedFuncInput, '~/app/typings', task)
    info.src.require(usedFuncOutput, '~/app/typings', task)
    info.src.require('T' + taskrefid, '~/app/typings', task)
    info.src.require(procInput, '~/app/typings', task)
    info.src.require(procLocal, '~/app/typings', task)
    info.src.require(procOutput, '~/app/typings', task)

    return w.chipResult(taskrefid, [
      [
        ['export const ', taskrefid, ': T' + taskrefid + ' = '],
        w.object({
          task: w.string(task.name.str),
          next: task.next,
          getContent: w.funcDecl(['varsPub'], '', [
            // ['const packageId = ', w.string(info.cfg.pkguri)],
            // ['const processId = ', w.string(info.cfg.procname)],
            // ['const taskId = ', w.string(task.name.str)],
            // ['const uid = (', w.string(info.cfg.pkguri + '_' + info.cfg.procname + '/' + task.name.str + '.') + ' + processInstanceId) as ArcholGUID'],
            [
              'const ctx = getExecutionContext(varsPub, ', w.string(task.name.str), ')'
            ],
            [
              'const view = ', w.funcDecl([''], '', [
                ['return <ExecuteFunctionRenderer ctx={ctx} />',]
              ], { arrow: true })
            ],
            [
              'const content: AppContent<' + procTyping + ', {}> = ', w.object({
                uid: w.string(taskuripref),
                varsPub: '',
                task: w.string(task.name.str),
                view: '',
                search: 'null as any',
                modify: 'varsPub.modify',
                title: usedFunc.title,
                bindings: 'null as any',
              })
            ],
            ['return content']
            // []

            //             ['const varsPub = getProcessVars<', 'T' + procuripref + 'InstanceVars', '>(packageId, processId, processInstanceId, volatileStorage)'],
            //             [
            //               'const input = copyVarsFromDoc<' + usedFuncInput + '>(varsPub,', task.useFunction.input, ' )'
            //             ],
            //             ['const output = executeFunction<', usedFuncInput + ', ' + usedFuncOutput + '>(packageId, processId, processInstanceId, taskId, input)'],
            //             ['const result = await output.result'],
            //             ['copyVarsToDoc(result, varsPub, ', task.useFunction.output, ' )'],
            //             ['return result']
          ]),
          // title: w.property('titlex', isCode(usedView.title) ? w.code(usedView.title) : usedView.title),
        })
      ]
    ], false)
  },
  UseTaskForks(w, forks) {
    return w.lines(forks.items.map((f) => {
      if (f.condition) return [f.task.str, w.code(f.condition)]
      return [f.task.str, ': true']
    }), '{', '}', ',')
  }
}, { pkguri: '', procname: '', storage: '' })

const genFunction = nodeTransformer({
  Function(w, f, { ws, src, cfg }) {

    const body: CodePartL[] = [
      ['return executeFunction(input)']
    ]
    const fid = cfg.pkguri + '_func_' + f.name.str
    src.require('FunctionContext', '~/lib/archol/functions', f)
    src.require('executeFunction', '~/lib/archol/functions', f)
    src.require('T' + fid + 'Exec', '~/app/typings', f);
    src.require('T' + fid + 'Output', '~/app/typings', f);
    src.require('T' + fid + 'Output', '~/app/typings', f);

    return w.chipResult(fid + 'Exec', [
      [
        'export function ', fid + 'Exec', w.funcDecl([
          'input: T' + fid + 'Input'
        ], 'FunctionContext<T' + fid + 'Output>', body
        )
      ]
    ], false)
  },
}, { pkguri: '' })

// const genViewInstanceType = nodeTransformer({
//   View(w, view, info) {
//     const viewuri = info.cfg.pkguri + '_view_' + view.name.str
//     info.src.require('ArcholViewInstance', '~/lib/archol/types', view)
//     info.src.require('T' + viewuri + 'Binder', '~/app/typings', view)
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