import { CodeBlockWriter } from 'ts-morph';
import { mapObject } from 'utils';
import { Application, Component, Process, Workspace, Operation, normalTypes, View, Type, Document, Fields, SourceNodeWithName, SourceNode, DocAction, ComponentRef } from '../../load/types';
import { quote, typePipeObj, typePipeStr } from '../lib/generator';
import { materialUiIcons } from './materialuiicons';

export async function generateDeclaration(ws: Workspace) {
  const declFileName = ws.path + '/ws/decl.d.ts'
  const sources = ws.ts.getSourceFiles()
  let declsource = sources.filter(s => s.getFilePath() === declFileName)[0]

  if (!declsource) declsource = ws.ts.createSourceFile(declFileName)
  const AllComponentUris = ws.allComponents()

  declsource.removeText()

  declareGlobals()

  for (const s of sources
    .map(s => s.getBaseName())
    .filter(s => s.endsWith('.app.ts'))) {
    const app = await ws.loadApp(s.replace(/\.app\.ts$/g, ''))
    genDeclApp(app)
  }
  declsource.formatText({
    indentSize: 2
  })
  return ws.ts.save()
  function genDeclApp(app: Application) {
    const appname = app.name.str
    declsource.addStatements((w) => {
      w.writeLine(`
declare function declareApplication (name: '${appname}', opts: {
  description: I18N,
  icon: Icon,
  uses: ${appname}_ComponentUses,
  start: ${appname}_AllProcs,
  login: ${appname}_AllProcs,
  error: ${appname}_AllProcs,
  langs: Lang[],
  builders: Builders
  pagelets: {
    [name: string]: Pagelet
  }
  routes: {
    [name: string]: ${appname}_Route 
  }
  sysroles: {
    public: Omit<Role, 'name'>,
    anonymous: Omit<Role, 'name'>,
    authenticated: Omit<Role, 'name'>,
  }
  menu: Menu[]
  mappings: ${appname}_Mappings
}): void      

declare type ${appname}_ComponentUses = {
  [alias: string]: AllComponentUris
}

declare type ${appname}_Route = string | ((app: ${appname}_Ref, ...args: any[]) => void)

declare type Menu = { 
  caption: I18N
  icon: Icon
  run: string | ((app: ${appname}_Ref) => void)
  allow: ${appname}_Roles
}

declare interface ${appname}_Ref {
${app.uses.props.map((u) => `${u.key.str}: ${u.val.ref(u.val.uri.sourceRef).uri.id.str}_Ref,`).join('\n')}
}

declare type ${appname}_Roles = 'public' | 'anonymous' | 'authenticated' | Array<${typePipeStr(
        app.uses.props.reduce<string[]>((ret, u) => {
          const alias = u.key.str
          const comp = u.val.ref(u.val.uri.sourceRef)
          return ret.concat(
            comp.roleDefs
              .map(r => alias + '/' + r.name.str)
              .concat(comp.roleGroups.map(r => alias + '/' + r.name.str)))
        }, []))}>

declare type ${appname}_AllProcs = ${typePipeStr((() => {
          const ret: string[] = []
          app.uses.props.forEach((u) => {
            const comp = u.val
            comp.ref(u.key).processes.props.forEach((proc) => {
              ret.push(u.key.str + '/' + proc.key.str)
            })
          })
          return ret
        })())}

declare type ${appname}_Mapping = ${typePipeStr(Object.keys(app.mappingList))}
declare type ${appname}_Mappings = {
  [uri in ${appname}_Mapping]?: string
}`.trimStart())
      app.allComponents.forEach((p) => genDeclComp(p, w))
    })
  }


  function genDeclComp(comp: Component, w: CodeBlockWriter) {

    const compid = comp.uri.id.str
    w.writeLine(`
declare function declareComponent (ns: '${comp.uri.ns.str}', path: '${comp.uri.path.str}'): ${compid}_DeclUses
declare interface ${compid}_DeclUses {
  uses (components: AppCVV_ComponentUses): ${compid}_DeclRoles
}
declare interface ${compid}_DeclRoles {
  roles (roles: ${compid}_Decl2Roles): ${compid}_DeclProcesses
}
declare type ${compid}_Decl2Roles = {
  [roleName: string]: Role | Array<${typePipeStr(
      comp.refs.roleDefs.items
        .map((r) => r.path))}>
}
type ${compid}_Roles = ${compid}_Role | ${compid}_Role[]
type ${compid}_Role = 'public' | 'anonymous' | 'authenticated' | ${typePipeStr(
          comp.refs.roleDefs.items.map((r) => r.path)
            .concat(comp.refs.roleGroups.items.map((r) => r.path))
        )
      }

declare interface ${compid}_DeclProcesses {
  processes (processes: {${comp.processes.props.map((p) => `${p.key.str}: ${compid}_process_${p.key.str}_Decl,`).join('\n')}
  }): ${compid}_DeclFunctions
}
declare interface ${compid}_DeclFunctions {
  operations (operations: {${comp.operations.props.map((f) => `${f.key.str}: ${compid}_operation_${f.key.str}_Decl,`).join('\n')}
  }): ${compid}_DeclViews
}
declare interface ${compid}_DeclViews {
  views (views: {${comp.views.props.map((v) => `${v.key.str}: ${compid}_view_${v.key.str}_Decl,`).join('\n')}
  }): ${compid}_DeclTypes
}
declare interface ${compid}_DeclTypes {
  types (types: {${comp.types.props.map((t) => `${t.key.str}: ${compid}_TypeDecl,`).join('\n')}
  }): ${compid}_DeclDocuments
}
declare interface ${compid}_DeclDocuments {
  documents (documents: {${comp.documents.props.map((d) => `${d.key.str}: ${compid}_document_${d.key.str}_Decl,`).join('\n')}
  }): ${compid}_DeclRoutes
}

declare type ${compid}_DocNames = ${typePipeStr(comp.documents.props.map((d) => d.key.str))}

declare interface ${compid}_DeclRoutes {
  routes (routes: { [path:string]: ${compid}_Route}): ${compid}_DeclTesting
}
declare type ${compid}_Route = string | ((app: ${compid}_Ref, ...args: any[]) => void)
declare interface ${compid}_DeclTesting {
  testing (scenarios: {[scenario in ${compid}_TestScenarios]: ${compid}_TestScenario}): void
}

declare interface ${compid}_Ref {
  dep: {
    ${comp.uses.props.map((u) => `${u.key.str}: ${u.val.ref(u.val.uri.sourceRef).uri.id.str}_Ref,`).join('\n')}
  },
  process: {  
    ${comp.processes.props.map((p) => `${p.key.str}: ${compid}_process_${p.key.str}_Ref,`).join('\n')}
  },
  documents: {  
    ${comp.documents.props.map((d) => `${d.key.str}: ${compid}_document_${d.key.str}_Ref,`).join('\n')}
  },
  operations: {  
    ${comp.operations.props.map((f) => `${f.key.str}: ${compid}_operation_${f.key.str}_Ref,`).join('\n')}
  },
}

type ${compid}_TypeName = BasicTypes | ${typePipeStr(addArrayTypes(
        comp.refs.types.items.map((t) => t.path)
          .concat(comp.refs.baseTypes.items.map(t => t.path))
      ))}

${comp.refs.baseTypes.items.map((b) => {
        const t = b.ref
        if (t.enumOptions) return `type ${b.path} = ${typePipeStr(t.enumOptions.props.map(p => p.key.str))}`
        if (t.complexFields) return asComplex()
        if (t.arrayType) return asArray()
        return `type ${b.path} = '${b.path} invalid'`
        function asComplex() {
          return `type ${b.path} = '${b.path} invalid'`
        }
        function asArray() {
          return `type ${b.path} = '${b.path} invalid'`
        }
      }).join('')
      }

declare type ${compid}_TypeDecl = ${typePipeObj(Object.keys(normalTypes)
        .filter((b) => b !== 'invalid')
        .map((b) => {
          if (b === 'enum') return `{
          base: "enum"
          options: {
            [key:string]: {
              value: string
              description: I18N
              icon: Icon
            }
          }
        }`
          if (b === 'complex') return `
          {
            base: "complex"
            fields: {
              [key:string]: ${compid}_TypeDecl
            }
          }`
          if (b === 'array') return `
          {
            base: "array"
            item: ${compid}_TypeDecl
          }  
          `
          const js = b === 'date' ? 'Date' : b
          return `{
          base: ${quote(b)}
          validate?(this: void, val: ${js}): string | false
          format?(this: void, val: ${js}): string
          parse?(this: void, str: string): ${js}
          }`.trim()
        }))
      }

interface ${compid}_DeclFields {
  [fieldName:string]: {
     description?: string
     type: ${compid}_TypeName
  }
}
interface ${compid}_DeclDocFields {
  [fieldName:string]: {
     description: string
     type: ${compid}_TypeName
  }
}
`.trimStart())
    comp.processes.props.forEach((p) => genDeclCompProcess(p.val))
    comp.operations.props.forEach((f) => genDeclCompOperation(f.val))
    comp.views.props.forEach((v) => genDeclCompView(v.val))
    comp.documents.props.forEach((d) => genDeclCompDoc(d.val))

    w.writeLine(`
    declare interface ${compid}_database {      
      ${comp.documents.props.map((d) => d.key.str +
      ': {[id in ' + compid + '_document_' + d.key.str + '_GUID]:'
      + compid + '_document_' + d.key.str + '_Data$}').join(',\n')}
    }
    `)

    genTestInfo()
    return

    function genDeclCompProcess(process: Process) {
      const procName = process.name.str
      w.writeLine(`
declare interface ${compid}_process_${procName}_Decl {
  title: I18N | ((vars: ${compid}_process_${procName}_InstanceVars)=>I18N),
  caption: I18N,
  icon: Icon,
  start: ${compid}_process_${procName}_Tasknames,
  volatile?: boolean,
  singleton?: boolean,
  allow: ${compid}_Roles,
  vars: ${compid}_process_${procName}_DeclVars,
  tasks: ${compid}_process_${procName}_DeclTasks,
}
declare type ${compid}_process_${procName}_Tasknames = ${typePipeStr(process.tasks.props.map((t) => t.key.str))}
declare interface ${compid}_process_${procName}_Ref {
  instanciate(input: {${process.vars.input.props.map((v) => v.key.str + ': ' + v.val.type.base(v.val)).join(',')}}): Promise<${compid}_process_${procName}_Instance>;  
  open(processInstanceId: GUID): Promise<${compid}_process_${procName}_Instance>;  
}
declare interface ${compid}_process_${procName}_Instance {
  modify(fn: (vars?: ${compid}_process_${procName}_InstanceVars) => boolean): ${compid}_process_${procName}_InstanceVars,
}
declare interface ${compid}_process_${procName}_DeclVars {
  input: ${compid}_DeclFields,
  output: ${compid}_DeclFields,
  local: ${compid}_DeclFields,
}
declare interface ${compid}_process_${procName}_InstanceVars {
  input: ${compid}_process_${procName}_InstanceVars_input,
  output: ${compid}_process_${procName}_InstanceVars_output,
  local: ${compid}_process_${procName}_InstanceVars_local,
}
declare type ${compid}_process_${procName}_DeclTasks = {
  [task: string]: ${compid}_process_${procName}_DeclTask,
}
declare type ${compid}_process_${procName}_DeclTask = ${typePipeObj(comp.operations.props.map(f => `{
    useOperation: {      
      operation: ${quote(f.key.str)},
      input: {
        ${f.val.input.keys().map((k) => `${k}: ${compid}_process_${procName}_Scope`)}
      },
      output: {
        ${f.val.output.keys().map((k) => `${k}: ${compid}_process_${procName}_Scope`)}
      }    
    },
    next: ${compid}_process_${procName}_NextTask,
}`).concat(comp.views.props.map(view => `{
  useView: {
    view: ${quote(view.key.str)}
    bind: ${compid}_view_${view.key.str}_DeclBind<${compid}_process_${procName}_Scope>
  },
  next: ${compid}_process_${procName}_NextTask,
  allow: ${compid}_Roles,
}`)))
        }
declare type ${compid}_process_${procName}_Scope = ${typePipeStr(process.refs.vars.items.map(v => v.path))}
declare type ${compid}_process_${procName}_NextTask = ${compid}_process_${procName}_Tasknames | ${compid}_process_${procName}_Tasknames[] | {
  [task in ${compid}_process_${procName}_Tasknames]?: (vars: ${compid}_process_${procName}_InstanceVars) => boolean
}`.trimStart())
      genDeclCompProcessFields()
      function genDeclCompProcessFields() {
        ['input', 'output', 'local'].forEach((scope) => w.writeLine(`
        declare interface ${compid}_process_${procName}_InstanceVars_${scope} {
          ${function () {
            const fields: Fields = (process.vars as any)[scope]
            return fields.props.map((f) => f.key.str + ': ' + f.val.type.base(null)).join('\n')
          }()}
        }`.trimStart()))
      }
    }
    function genDeclCompOperation(op: Operation) {
      const opName = op.name.str
      w.writeLine(`
declare interface ${compid}_operation_${opName}_Decl {
  title: I18N
  cancelabled?: boolean
  level: OperationLevel
  input: ${compid}_DeclFields,
  output: ${compid}_DeclFields,
  code (args: { 
    input: ${compid}_operation_${opName}_InputRef, 
    output: ${compid}_operation_${opName}_OutputRef, 
    progress: (percent: number, msg?: string)=>void,
    ${op.cancelabled ? 'canceled: ()=>boolean' : ''}
  }): void
}
declare type ${compid}_operation_${opName}_Ref = (input: ${compid}_operation_${opName}_InputRef, output: ${compid}_operation_${opName}_OutputRef) => Promise<void>
declare interface ${compid}_operation_${opName}_InputRef {
  ${op.input.props.map((f) => `  ${f.key.str}:${f.val.type.base(null)}`)}
}
declare interface ${compid}_operation_${opName}_OutputRef {
  ${op.output.props.map((f) => `  ${f.key.str}:${f.val.type.base(null)}`)}
}
`.trimStart())
    }
    function genDeclCompView(view: View) {
      const viewName = view.name.str
      w.writeLine(`
declare interface ${compid}_view_${viewName}_Decl {
  title: I18N ${view.refs.fields.props.length ? `| ((data: ${compid}_view_${viewName}_DeclData) => I18N)` : ''}
  content: ${compid}_view_${viewName}_DeclContent
  primaryAction?: IAction<${compid}_view_${viewName}_DeclData>
  secondaryAction?: IAction<${compid}_view_${viewName}_DeclData>
  otherActions?: Array<IAction<${compid}_view_${viewName}_DeclData>>
}
declare type ${compid}_view_${viewName}_DeclContent = ${compid}_view_${viewName}_DeclWidgget[]
declare type ${compid}_view_${viewName}_DeclWidgget = {
  content: ${compid}_view_${viewName}_DeclContent
} | {
  model: 'show' | 'edit'
  caption: I18N
  field: string
  type: ${compid}_TypeName
} | { markdown: I18N } 
declare interface ${compid}_view_${viewName}_DeclData {
  ${view.refs.fields.props.map((f) => {
        return `${f.key.str}: ${f.val.type ? f.val.type.base(null) : 'invalid type'}`
      })}
}
declare interface ${compid}_view_${viewName}_DeclBind<S> {
  ${view.refs.fields.props.map((f) => `${f.key.str}: S`)}
}
`.trimStart())
    }
    function genDeclCompDoc(doc: Document) {
      const docName = doc.name.str
      w.writeLine(`
declare interface ${compid}_document_${docName}_Decl {
  caption: I18N
  persistence: DocPersistence
  identification: 'Centralized'|'ByPeer',
  states: {
    ${doc.states.keys().map((k) => `${k}: DocState`).join('\n')}    
  }
  primaryFields: ${compid}_DeclDocFields
  secondaryFields: ${compid}_DeclDocFields
  indexes: { [name: string]: ${compid}_document_${docName}_Fieldname[] }
  actions: ${compid}_document_${docName}_DeclActions
}
declare type ${compid}_document_${docName}_GUID = ${typePipeStr(
        [`${compid}_document_${docName}_GUID`].concat((() => {
          const r: string[] = []
          comp.testing.props.forEach((scenario) => {
            scenario.val.documents.props.forEach(d => {
              d.val.data.items.forEach((v) => {
                r.push(v.data.$id)
              })
            })
          })
          return r
        })())
      )}
declare type ${compid}_document_${docName}_Fieldname = ${typePipeStr(doc.refs.allFields.items.map((f) => f.path))}
declare type ${compid}_document_${docName}_StateName = ${typePipeStr(doc.refs.states.items.map((f) => f.path))}
declare type ${compid}_document_${docName}_ActionName = ${typePipeStr(doc.refs.actions.items.map((f) => f.path))}
declare interface ${compid}_document_${docName}_DeclActions {
  ${doc.refs.actions.items.map(genAction).join(',\n')}      
}

declare interface ${compid}_document_${docName}_Data {
  ${doc.refs.allFields.items.map((f) =>
        `${f.path}:${f.ref.type.base(null)}`
      ).join('\n')}  
}
declare interface ${compid}_document_${docName}_Data$ extends ${compid}_document_${docName}_Data {
  $id: ${compid}_document_${docName}_GUID
  $state: ${compid}_document_${docName}_StateName
}

declare interface ${compid}_document_${docName}_Ref {
  ${doc.refs.actions.items.map((a) =>
        `${a.path}: ${a.ref.run ?
          '(' +
          (a.ref.from ? 'data: ' + compid + '_document_' + docName + '_GUID,' : '') +
          actionArgs(a) +
          ') => ' +
          actionRet(a, docName)

          : '(' + (a.ref.from ? 'data: ' + compid + '_document_' + docName + '_GUID' : '')
          + ') => Promise<void>'
        }
`).join('')}}
`.trimStart())
      function genAction(a: ComponentRef<DocAction>) {
        const acargs = actionArgs(a)
        const acret = a.ref.from ? actionRet(a, docName) : 'Promise<void>'
        return `${a.path}: {
          from?: ${compid}_document_${docName}_StateName | ${compid}_document_${docName}_StateName[],
          to: ${compid}_document_${docName}_StateName | ${compid}_document_${docName}_StateName[],
          icon: Icon,
          description: I18N,
          run?(data: ${compid}_document_${docName}_Data, ${acargs}): ${acret}     
        }`
      }
    }

    function actionArgs(a: ComponentRef<DocAction>) {
      return a.ref.run ? a.ref.run.params.map((p, idx) => {
        const ptxt = p.getText()
        if (idx === 0) {
          if (ptxt.includes(':')) ws.error('nao deve ter o tipo', p)
          return null
        }
        return ptxt
      }).filter((p) => p !== null).join() : ''
    }

    function actionRet(a: ComponentRef<DocAction>, docName: string) {
      return a.ref.from ?
        (a.ref.run ? a.ref.run.ret.getText() : 'Promise<void>')
        : `Promise<${compid}_document_${docName}_GUID>`
    }

    function genTestInfo() {

      const scenarios: string[] = comp.testing.props.map((t) => t.key.str)

      declsource.addStatements((w) => {
        w.write(`
        declare interface ${compid}_TestScenario {
          now: string,
          cases: ${compid}_TestCases
          documents: ${compid}_TestDocuments
        }

        declare interface ${compid}_TestCases {
          [testname: string]: (pkg: ${compid}_Ref, db: ${compid}_database)=>void
        }
              
        declare interface ${compid}_TestDocuments {${comp.documents.props.map((d) => `
          ${d.key.str}: ${compid}_document_${d.key.str}_Data$[]`)}
        }
            
        declare type ${compid}_TestScenarios = ${typePipeStr(scenarios)}
    `)
      })

    }
  }
  function declareGlobals() {
    declsource.addStatements((w) => {
      w.write(`
/* eslint-disable */

declare type Icon = ${typePipeStr(materialUiIcons)}
declare type GUID = '$GUID'

declare type I18N = string | {
  [lang in Lang]?: string
}

declare type Lang = 'pt' | 'en'

declare interface BuilderConfig {  
}

declare interface Role {
  description: I18N,
  icon: Icon
}

declare interface IAction<T> {
  caption: I18N,
  icon?: Icon,
  run: "back" | "next" | ((data: T) => Promise<void>)
}

declare type BasicTypes = ${typePipeStr(addArrayTypes(
        Object.keys(normalTypes)
          .filter(n => (normalTypes as any)[n])
      ))
        }

declare type DocPersistence = 'session' | 'persistent'
declare interface DocState {
  icon: Icon
  description: I18N
}

declare type OperationLevel = 'cpu' | 'io' | 'proc'

declare type Pagelet = {
  drawer?: true,
  left: number
} | {
  drawer?: true,
  top: number
} | {
  drawer?: true,
  bottom: number
} | {
  drawer?: true,
  right: number
} | {
  content: true,
}

declare interface Builders { "mui-deepstream": BuilderConfig }

declare type AllComponentUris = ${typePipeStr(AllComponentUris)}

declare function expect<T>(actual:T): {
  toBe(expected: T)
}

`.trimStart())
    })
  }

}

function addArrayTypes(s: string[]) {
  return s.concat(s.map(i => i + '[]'))
}
