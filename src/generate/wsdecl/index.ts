import { CodeBlockWriter } from 'ts-morph';
import {
  Application, Component, Process, Workspace, Operation, normalTypes, View,
  Document, Fields,
  DocAction, ComponentRef, isStringConst
} from '../../load/types';
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
  document: {  
    ${comp.documents.props.map((d) => `${d.key.str}: ${compid}_document_${d.key.str}_Ref,`).join('\n')}
  },
  operation: {  
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
     optional?: boolean
  }
}
interface ${compid}_DeclDocFields {
  [fieldName:string]: {
     description: string
     type: ${compid}_TypeName
     optional?: boolean
  }
}
`.trimStart())
    comp.processes.props.forEach((p) => genDeclCompProcess(p.val))
    comp.operations.props.forEach((f) => genDeclCompOperation(f.val))
    comp.views.props.forEach((v) => genDeclCompView(v.val))
    comp.documents.props.forEach((d) => genDeclCompDoc(d.val))

    w.writeLine(`
    declare interface ${compid}_testdatabase {      
      ${comp.documents.props.map((d) => d.key.str +
      ': {get(id: ' + compid + '_document_' + d.key.str + '_GUID): Promise<'
      + compid + '_document_' + d.key.str + '_Data$>}').join(',\n')}
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
            return fields.props.map((f) => f.key.str + (f.val.optional ? '?' : '') + ': ' + f.val.type.base(null)).join('\n')
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
        return `${f.key.str}${f.val.optional ? '?' : ''}: ${f.val.type ? f.val.type.base(null) : 'invalid type'}`
      })}
}
declare interface ${compid}_view_${viewName}_DeclBind<S> {
  ${view.refs.fields.props.map((f) => `${f.key.str}${f.val.optional ? '?' : ''}: S`)}
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
        [`${compid}_document_${docName}_GUID`].concat(comp.testingGUIDs(docName))
      )}
declare type ${compid}_document_${docName}_Fieldname = ${typePipeStr(doc.refs.allFields.items.map((f) => f.path))}
declare type ${compid}_document_${docName}_StateName = ${typePipeStr(doc.refs.states.items.map((f) => f.path))}
declare type ${compid}_document_${docName}_ActionName = ${typePipeStr(doc.refs.actions.items.map((f) => f.path))}
declare interface ${compid}_document_${docName}_DeclActions {
  ${doc.refs.actions.items.map(genAction).join(',\n')}      
}

declare interface ${compid}_document_${docName}_Data {
  ${doc.refs.allFields.items.map((f) =>
        `${f.path}${f.ref.optional ? '?' : ''}:${f.ref.type.base(null)}`
      ).join('\n')}  
}
declare type ${compid}_document_${docName}_Update1 = (data: Partial<${compid}_document_${docName}_Data> )=>Promise<void>

declare type ${compid}_document_${docName}_UpdateM<ST extends ${compid}_document_${docName}_StateName> = (data: Partial<${compid}_document_${docName}_Data> & {$state: ST})=>Promise<void>

declare interface ${compid}_document_${docName}_Data$ extends ${compid}_document_${docName}_Data {
  $id: ${compid}_document_${docName}_GUID
  $state: ${compid}_document_${docName}_StateName
}

declare interface ${compid}_document_${docName}_Ref {
  ${doc.refs.actions.items.map((a) =>
        `${a.path}: ${'(' +
        actionArgs(docName, a, true) +
        ') => ' +
        actionRet(docName, a, true)
        }
`).join('')}}
`.trimStart())

      function genAction(a: ComponentRef<DocAction>) {
        const acargs = actionArgs(docName, a, false)
        const acret = actionRet(docName, a, false)
        return `${a.path}: {
          from?: ${compid}_document_${docName}_StateName | ${compid}_document_${docName}_StateName[],
          to?: ${compid}_document_${docName}_StateName | ${compid}_document_${docName}_StateName[],
          icon: Icon,
          description: I18N,
          run?(${acargs}): ${acret}     
        }`
      }
    }

    function actionArgs(docName: string, a: ComponentRef<DocAction>, ref: boolean): string {
      const args: string[] = a.ref.run ? a.ref.run.params.map((p, idx) => {
        const ptxt = p.getText()
        if (a.ref.from && idx === 0) {
          if (ptxt.includes(':')) ws.error('nao deve ter o tipo', p)
          return null as any as string
        }
        return ptxt
      }).filter((p) => p !== null) : []
      if (ref) {
        if (a.ref.from) args.splice(0, 0, '$id: ' + compid + '_document_' + docName + '_GUID')
      } else {
        if (a.ref.from) {
          if (a.ref.to) {
            const upd = compid + '_document_' + docName + '_Update' + (
              a.ref.to.states.items.length === 1 ? '1' : 'M<' + a.ref.to.states.items.map(i => i.str).join(' | ') + '>'
            )
            args.splice(0, 0, 'update: ' + upd)
          } // delete
          else args.splice(0, 0, 'data: Readonly<' + compid + '_document_' + docName + '_Data>')
        }
      }
      return args.join(', ')
    }

    function actionRet(docName: string, a: ComponentRef<DocAction>, ref: boolean) {
      if (ref) {
        if (a.ref.from) // update or delete
          return a.ref.run ? a.ref.run.ret.getText() : 'Promise<void>'
        else // insert
          return `Promise<${compid}_document_${docName}_GUID>`
      } else {
        if (a.ref.from) // update or delete
          return a.ref.run ? a.ref.run.ret.getText() : 'Promise<void>'
        else // insert
          return `Promise<${compid}_document_${docName}_Data>`
      }
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
          [testname: string]: (pkg: ${compid}_Ref, db: ${compid}_testdatabase)=>void
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

${testassertions()}

`.trimStart())
    })
  }

  function testassertions() {
    return `
declare interface ExpectStatic {
  (val: any, message?: string): Assertion;
  fail(message?: string): never;
  fail(actual: any, expected: any, message?: string, operator?: Operator): never;
}
interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
  not: Assertion;
  deep: Deep;
  ordered: Ordered;
  nested: Nested;
  own: Own;
  any: KeyFilter;
  all: KeyFilter;
  a: TypeComparison;
  an: TypeComparison;
  include: Include;
  includes: Include;
  contain: Include;
  contains: Include;
  ok: Assertion;
  true: Assertion;
  false: Assertion;
  null: Assertion;
  undefined: Assertion;
  NaN: Assertion;
  exist: Assertion;
  empty: Assertion;
  arguments: Assertion;
  Arguments: Assertion;
  finite: Assertion;
  equal: Equal;
  equals: Equal;
  eq: Equal;
  eql: Equal;
  eqls: Equal;
  property: Property;
  ownProperty: Property;
  haveOwnProperty: Property;
  ownPropertyDescriptor: OwnPropertyDescriptor;
  haveOwnPropertyDescriptor: OwnPropertyDescriptor;
  length: Length;
  lengthOf: Length;
  match: Match;
  matches: Match;
  string(string: string, message?: string): Assertion;
  keys: Keys;
  key(string: string): Assertion;
  throw: Throw;
  throws: Throw;
  Throw: Throw;
  respondTo: RespondTo;
  respondsTo: RespondTo;
  itself: Assertion;
  satisfy: Satisfy;
  satisfies: Satisfy;
  closeTo: CloseTo;
  approximately: CloseTo;
  members: Members;
  increase: PropertyChange;
  increases: PropertyChange;
  decrease: PropertyChange;
  decreases: PropertyChange;
  change: PropertyChange;
  changes: PropertyChange;
  extensible: Assertion;
  sealed: Assertion;
  frozen: Assertion;
  oneOf(list: ReadonlyArray<any>, message?: string): Assertion;
}

interface LanguageChains {
  to: Assertion;
  be: Assertion;
  been: Assertion;
  is: Assertion;
  that: Assertion;
  which: Assertion;
  and: Assertion;
  has: Assertion;
  have: Assertion;
  with: Assertion;
  at: Assertion;
  of: Assertion;
  same: Assertion;
  but: Assertion;
  does: Assertion;
}

interface NumericComparison {
  above: NumberComparer;
  gt: NumberComparer;
  greaterThan: NumberComparer;
  least: NumberComparer;
  gte: NumberComparer;
  below: NumberComparer;
  lt: NumberComparer;
  lessThan: NumberComparer;
  most: NumberComparer;
  lte: NumberComparer;
  within(start: number, finish: number, message?: string): Assertion;
  within(start: Date, finish: Date, message?: string): Assertion;
}

interface NumberComparer {
  (value: number | Date, message?: string): Assertion;
}

interface TypeComparison {
  (type: string, message?: string): Assertion;
  instanceof: InstanceOf;
  instanceOf: InstanceOf;
}

interface InstanceOf {
  (constructor: any, message?: string): Assertion;
}

interface CloseTo {
  (expected: number, delta: number, message?: string): Assertion;
}

interface Nested {
  include: Include;
  includes: Include;
  contain: Include;
  contains: Include;
  property: Property;
  members: Members;
}

interface Own {
  include: Include;
  includes: Include;
  contain: Include;
  contains: Include;
  property: Property;
}

interface Deep extends KeyFilter {
  equal: Equal;
  equals: Equal;
  eq: Equal;
  include: Include;
  includes: Include;
  contain: Include;
  contains: Include;
  property: Property;
  ordered: Ordered;
  nested: Nested;
  own: Own;
}

interface Ordered {
  members: Members;
}

interface KeyFilter {
  keys: Keys;
  members: Members;
}

interface Equal {
  (value: any, message?: string): Assertion;
}

interface Property {
  (name: string, value: any, message?: string): Assertion;
  (name: string, message?: string): Assertion;
}

interface OwnPropertyDescriptor {
  (name: string, descriptor: PropertyDescriptor, message?: string): Assertion;
  (name: string, message?: string): Assertion;
}

interface Length extends LanguageChains, NumericComparison {
  (length: number, message?: string): Assertion;
}

interface Include {
  (value: any, message?: string): Assertion;
  keys: Keys;
  deep: Deep;
  ordered: Ordered;
  members: Members;
  any: KeyFilter;
  all: KeyFilter;
}

interface Match {
  (regexp: RegExp, message?: string): Assertion;
}

interface Keys {
  (...keys: string[]): Assertion;
  (keys: ReadonlyArray<any> | Object): Assertion;
}

interface Throw {
  (expected?: string | RegExp, message?: string): Assertion;
  (constructor: Error | Function, expected?: string | RegExp, message?: string): Assertion;
}

interface RespondTo {
  (method: string, message?: string): Assertion;
}

interface Satisfy {
  (matcher: Function, message?: string): Assertion;
}

interface Members {
  (set: ReadonlyArray<any>, message?: string): Assertion;
}

interface PropertyChange {
  (object: Object, property?: string, message?: string): Assertion;
}    

declare type Operator = "==" | "===" | ">" | ">=" | "<" | "<=" | "!=" | "!==";

declare type OperatorComparable = boolean | null | number | string | undefined | Date;

declare const expect: ExpectStatic
    `
  }
}

function addArrayTypes(s: string[]) {
  return s.concat(s.map(i => i + '[]'))
}
