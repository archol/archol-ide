import { CodeLines, CodePartL, CodePartLines } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { withPathTransverser } from 'generate/lib/transverses/withPathTransverser'
import { isCodeNode, isWidgetContent, isWidgetEntry, isWidgetMarkdown, WidgetContent, WidgetEntry, WidgetMarkdown } from 'load/types'
import { genUseType } from './useType'

export const generateClientCompProcesses = sourceTransformer({
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
      comp.processes.props.forEach((v) => {
        transformFile('~/app/' + comp.uri.id.str + '/processes/' + v.key.str + '.tsx', genProcess.make(v.val, { compuri }))
      })
      return ''
    },
  }
})

const genProcess = nodeTransformer({
  Process(w, proc, info) {
    const procuripref = info.cfg.compuri + '_proc_' + proc.name.str
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
    return w.statements([
      [
        'export const ' + procrefid + ': T' + procrefid + ' = ',
        w.object({
          // componentId: w.string(info.cfg.compuri),
          // processId: w.string(proc.name.str),
          uri: [w.string(info.cfg.compuri + '_' + proc.name.str) + ' as ArcholGUID'],
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
              compuri: info.cfg.compuri,
              procname: proc.name.str,
              storage
            }))
          ),
        })
      ]
    ], false)
  },
}, { compuri: '' })

const genProcessTask = nodeTransformer({
  UITask(w, task, info) {
    const procuripref = info.cfg.compuri + '_proc_' + info.cfg.procname
    const taskuripref = procuripref + "_task_" + task.name.str
    const taskdecl = taskuripref + 'Decl'
    const usedView = task.useView.ref(task)
    const hasfields = usedView.refs.fields.props.length
    const usedViewId = 'View' + usedView.name.str
    const usedViewInst = 'T' + info.cfg.compuri + '_view_' + usedView.name.str + 'Instance'
    const usedViewData = 'T' + info.cfg.compuri + '_view_' + usedView.name.str + 'Data'
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
    info.src.require(usedViewId, '~/app/' + info.cfg.compuri + '/views/' + usedView.name.str, task)
    return w.chipResult(taskdecl, [
      [
        ['export const ', taskdecl, ': T', taskdecl, ' = '],
        w.object({
          task: w.string(task.name.str),
          next: task.next,
          getContent: w.funcDecl(['varsPub'], '', [
            // ['const componentId = ', w.string(info.cfg.compuri)],
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
    const procuripref = info.cfg.compuri + '_proc_' + info.cfg.procname
    const taskuripref = procuripref + "_task_" + task.name.str
    const taskrefid = taskuripref + 'Decl'
    const usedOp = task.useOperation.ref(task)
    const usedOpId = 'Operation' + usedOp.name.str
    const usedOpInput = 'T' + info.cfg.compuri + '_operation_' + usedOp.name.str + 'Input'
    const usedOpOutput = 'T' + info.cfg.compuri + '_operation_' + usedOp.name.str + 'Output'
    const procInput = 'T' + procuripref + 'Input'
    const procLocal = 'T' + procuripref + 'Local'
    const procOutput = 'T' + procuripref + 'Output'
    const procTask = 'T' + procuripref + 'Task'
    const procTyping = procInput + ', ' + procLocal + ', ' + procOutput + ', ' + procTask

    info.src.requireDefault('React', 'react', task)
    info.src.require('ExecuteOperationRenderer', '~/layout/app/executeOperationRenderer', task)
    info.src.require('getExecutionContext', '~/lib/archol/operations', task)
    info.src.require('ArcholGUID', '~/lib/archol/types', task)
    info.src.require(usedOpInput, '~/app/typings', task)
    info.src.require(usedOpOutput, '~/app/typings', task)
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
            // ['const componentId = ', w.string(info.cfg.compuri)],
            // ['const processId = ', w.string(info.cfg.procname)],
            // ['const taskId = ', w.string(task.name.str)],
            // ['const uid = (', w.string(info.cfg.compuri + '_' + info.cfg.procname + '/' + task.name.str + '.') + ' + processInstanceId) as ArcholGUID'],
            [
              'const view = ', w.funcDecl([''], '', [
                ['const ctx = getExecutionContext(varsPub, ', w.string(task.name.str), ')'],
                ['return <ExecuteOperationRenderer ctx={ctx} />',]
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
                title: usedOp.title,
                bindings: 'null as any',
              })
            ],
            ['return content']
            // []

            //             ['const varsPub = getProcessVars<', 'T' + procuripref + 'InstanceVars', '>(componentId, processId, processInstanceId, volatileStorage)'],
            //             [
            //               'const input = copyVarsFromDoc<' + usedFuncInput + '>(varsPub,', task.useFunction.input, ' )'
            //             ],
            //             ['const output = executeFunction<', usedFuncInput + ', ' + usedFuncOutput + '>(componentId, processId, processInstanceId, taskId, input)'],
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
}, { compuri: '', procname: '', storage: '' })
