import { CodeBlockWriter } from 'ts-morph';
import { Application, Package, Process, Workspace, Function, normalTypes, View, Type, Document, Fields, SourceNodeWithName, SourceNode } from '../../load/types';
import { quote, typePipeObj, typePipeStr } from '../lib/generator';
import { materialUiIcons } from './materialuiicons';

export async function generateDeclaration(ws: Workspace) {
  const declFileName = ws.path + '/ws/decl.d.ts'
  const sources = ws.ts.getSourceFiles()
  let declsource = sources.filter(s => s.getFilePath() === declFileName)[0]

  if (!declsource) declsource = ws.ts.createSourceFile(declFileName)
  const AllPackageUris = ws.allPackages()

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
  uses: ${appname}_PackageUses,
  start: ${appname}_AllProcs,
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

declare type ${appname}_PackageUses = {
  [alias: string]: AllPackageUris
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
          const pkg = u.val.ref(u.val.uri.sourceRef)
          return ret.concat(
            pkg.roleDefs
              .map(r => alias + '/' + r.name.str)
              .concat(pkg.roleGroups.map(r => alias + '/' + r.name.str)))
        }, []))}>

declare type ${appname}_AllProcs = ${typePipeStr((() => {
          const ret: string[] = []
          app.uses.props.forEach((u) => {
            const pkg = u.val
            pkg.ref(u.key).processes.props.forEach((proc) => {
              ret.push(u.key.str + '/' + proc.key.str)
            })
          })
          return ret
        })())}

declare type ${appname}_Mapping = ${typePipeStr(Object.keys(app.mappingList))}
declare type ${appname}_Mappings = {
  [uri in ${appname}_Mapping]?: string
}`.trimStart())
      app.allPackages.forEach((p) => genDeclPkg(p, w))
    })
  }


  function genDeclPkg(pkg: Package, w: CodeBlockWriter) {
    const pkgid = pkg.uri.id.str
    w.writeLine(`
declare function declarePackage (ns: '${pkg.uri.ns.str}', path: '${pkg.uri.path.str}'): ${pkgid}_DeclUses
declare interface ${pkgid}_DeclUses {
  uses (packages: AppCVV_PackageUses): ${pkgid}_DeclRoles
}
declare interface ${pkgid}_DeclRoles {
  roles (roles: ${pkgid}_Decl2Roles): ${pkgid}_DeclProcesses
}
declare type ${pkgid}_Decl2Roles = {
  [roleName: string]: Role | Array<${typePipeStr(
      pkg.refs.roleDefs.items
        .map((r) => r.path))}>
}
type ${pkgid}_Roles = ${pkgid}_Role | ${pkgid}_Role[]
type ${pkgid}_Role = 'public' | 'anonymous' | 'authenticated' | ${typePipeStr(
          pkg.refs.roleDefs.items.map((r) => r.path)
            .concat(pkg.refs.roleGroups.items.map((r) => r.path))
        )
      }

declare interface ${pkgid}_DeclProcesses {
  processes (processes: {${pkg.processes.props.map((p) => `${p.key.str}: ${pkgid}_process_${p.key.str}_Decl,`).join('\n')}
  }): ${pkgid}_DeclFunctions
}
declare interface ${pkgid}_DeclFunctions {
  functions (functions: {${pkg.functions.props.map((f) => `${f.key.str}: ${pkgid}_function_${f.key.str}_Decl,`).join('\n')}
  }): ${pkgid}_DeclViews
}
declare interface ${pkgid}_DeclViews {
  views (views: {${pkg.views.props.map((v) => `${v.key.str}: ${pkgid}_view_${v.key.str}_Decl,`).join('\n')}
  }): ${pkgid}_DeclTypes
}
declare interface ${pkgid}_DeclTypes {
  types (types: {${pkg.types.props.map((t) => `${t.key.str}: ${pkgid}_TypeDecl,`).join('\n')}
  }): ${pkgid}_DeclDocuments
}
declare interface ${pkgid}_DeclDocuments {
  documents (documents: {${pkg.documents.props.map((d) => `${d.key.str}: ${pkgid}_document_${d.key.str}_Decl,`).join('\n')}
  }): ${pkgid}_DeclRoutes
}
declare interface ${pkgid}_DeclRoutes {
  routes (routes: { [path:string]: ${pkgid}_Route}): void
}
declare type ${pkgid}_Route = string | ((app: ${pkgid}_Ref, ...args: any[]) => void)

declare interface ${pkgid}_Ref {
  dep: {
    ${pkg.uses.props.map((u) => `${u.key.str}: ${u.val.ref(u.val.uri.sourceRef).uri.id.str}_Ref,`).join('\n')}
  },
  process: {  
    ${pkg.processes.props.map((p) => `${p.key.str}: ${pkgid}_process_${p.key.str}_Ref,`).join('\n')}
  },
  documents: {  
    ${pkg.documents.props.map((d) => `${d.key.str}: ${pkgid}_document_${d.key.str}_Ref,`).join('\n')}
  },
  functions: {  
    ${pkg.functions.props.map((f) => `${f.key.str}: ${pkgid}_function_${f.key.str}_Ref,`).join('\n')}
  },
}

type ${pkgid}_TypeName = BasicTypes | ${typePipeStr(addArrayTypes(
        pkg.refs.types.items.map((t) => t.path)
          .concat(pkg.refs.baseTypes.items.map(t => t.path))
      ))}

${pkg.refs.baseTypes.items.map((b) => {
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

declare type ${pkgid}_TypeDecl = ${typePipeObj(Object.keys(normalTypes)
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
              [key:string]: ${pkgid}_TypeDecl
            }
          }`
          if (b === 'array') return `
          {
            base: "array"
            item: ${pkgid}_TypeDecl
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

interface ${pkgid}_DeclFields {
  [fieldName:string]: {
     description?: string
     type: ${pkgid}_TypeName
  }
}
interface ${pkgid}_DeclDocFields {
  [fieldName:string]: {
     description: string
     type: ${pkgid}_TypeName
  }
}
`.trimStart())
    pkg.processes.props.forEach((p) => genDeclPkgProcess(p.val))
    pkg.functions.props.forEach((f) => genDeclPkgFunction(f.val))
    pkg.views.props.forEach((v) => genDeclPkgView(v.val))
    pkg.documents.props.forEach((d) => genDeclPkgDoc(d.val))
    return

    function genDeclPkgProcess(process: Process) {
      const procName = process.name.str
      w.writeLine(`
declare interface ${pkgid}_process_${procName}_Decl {
  title: I18N | ((vars: ${pkgid}_process_${procName}_InstanceVars)=>I18N),
  caption: I18N,
  icon: Icon,
  start: ${pkgid}_process_${procName}_Tasknames,
  volatile: boolean,
  allow: ${pkgid}_Roles,
  vars: ${pkgid}_process_${procName}_DeclVars,
  tasks: ${pkgid}_process_${procName}_DeclTasks,
}
declare type ${pkgid}_process_${procName}_Tasknames = ${typePipeStr(process.tasks.props.map((t) => t.key.str))}
declare interface ${pkgid}_process_${procName}_Ref {
  start(${process.vars.input.props.map((v) => v.key.str + ': ' + v.val.type.base(v.val)).join(',')}): Promise<${pkgid}_process_${procName}_Instance>;
}
declare interface ${pkgid}_process_${procName}_Instance {
  vars: ${pkgid}_process_${procName}_InstanceVars,
}
declare interface ${pkgid}_process_${procName}_DeclVars {
  input: ${pkgid}_DeclFields,
  output: ${pkgid}_DeclFields,
  local: ${pkgid}_DeclFields,
}
declare interface ${pkgid}_process_${procName}_InstanceVars {
  input: ${pkgid}_process_${procName}_InstanceVars_input,
  output: ${pkgid}_process_${procName}_InstanceVars_output,
  local: ${pkgid}_process_${procName}_InstanceVars_local,
}
declare type ${pkgid}_process_${procName}_DeclTasks = {
  [task: string]: ${pkgid}_process_${procName}_DeclTask,
}
declare type ${pkgid}_process_${procName}_DeclTask = ${typePipeObj(pkg.functions.props.map(f => `{
    useFunction: {      
      function: ${quote(f.key.str)},
      input: {
        ${f.val.input.keys().map((k) => `${k}: ${pkgid}_process_${procName}_Scope`)}
      },
      output: {
        ${f.val.output.keys().map((k) => `${k}: ${pkgid}_process_${procName}_Scope`)}
      }    
    },
    next: ${pkgid}_process_${procName}_NextTask,
}`).concat(pkg.views.props.map(view => `{
  useView: {
    view: ${quote(view.key.str)}
    bind: ${pkgid}_view_${view.key.str}_DeclBind<${pkgid}_process_${procName}_Scope>
  },
  next: ${pkgid}_process_${procName}_NextTask,
  allow: ${pkgid}_Roles,
}`)))
        }
declare type ${pkgid}_process_${procName}_Scope = ${typePipeStr(process.refs.vars.items.map(v => v.path))}
declare type ${pkgid}_process_${procName}_NextTask = ${pkgid}_process_${procName}_Tasknames | ${pkgid}_process_${procName}_Tasknames[] | {
  [task in ${pkgid}_process_${procName}_Tasknames]?: (vars: ${pkgid}_process_${procName}_InstanceVars) => boolean
}`.trimStart())
      genDeclPkgProcessFields()
      function genDeclPkgProcessFields() {
        ['input', 'output', 'local'].forEach((scope) => w.writeLine(`
        declare interface ${pkgid}_process_${procName}_InstanceVars_${scope} {
          ${function () {
            const fields: Fields = (process.vars as any)[scope]
            return fields.props.map((f) => f.key.str + ': ' + f.val.type.base(null)).join('\n')
          }()}
        }`.trimStart()))
      }
    }
    function genDeclPkgFunction(func: Function) {
      const funcName = func.name.str
      w.writeLine(`
declare interface ${pkgid}_function_${funcName}_Decl {
  title: I18N
  cancelabled?: boolean
  level: FunctionLevel
  input: ${pkgid}_DeclFields,
  output: ${pkgid}_DeclFields,
  code (args: { 
    input: ${pkgid}_function_${funcName}_InputRef, 
    output: ${pkgid}_function_${funcName}_OutputRef, 
    progress: (percent: number, msg?: string)=>void,
    ${func.cancelabled ? 'canceled: ()=>boolean' : ''}
  }): void
}
declare type ${pkgid}_function_${funcName}_Ref = (input: ${pkgid}_function_${funcName}_InputRef, output: ${pkgid}_function_${funcName}_OutputRef) => Promise<void>
declare interface ${pkgid}_function_${funcName}_InputRef {
  ${func.input.props.map((f) => `  ${f.key.str}:${f.val.type.base(null)}`)}
}
declare interface ${pkgid}_function_${funcName}_OutputRef {
  ${func.output.props.map((f) => `  ${f.key.str}:${f.val.type.base(null)}`)}
}
`.trimStart())
    }
    function genDeclPkgView(view: View) {
      const viewName = view.name.str
      w.writeLine(`
declare interface ${pkgid}_view_${viewName}_Decl {
  title?: I18N ${view.refs.fields.props.length ? `| ((data: ${pkgid}_view_${viewName}_DeclData) => I18N)` : ''}
  content: ${pkgid}_view_${viewName}_DeclContent
  primaryAction?: IAction<${pkgid}_view_${viewName}_DeclData>
  secondaryAction?: IAction<${pkgid}_view_${viewName}_DeclData>
  otherActions?: Array<IAction<${pkgid}_view_${viewName}_DeclData>>
}
declare type ${pkgid}_view_${viewName}_DeclContent = ${pkgid}_view_${viewName}_DeclWidgget[]
declare type ${pkgid}_view_${viewName}_DeclWidgget = {
  content: ${pkgid}_view_${viewName}_DeclContent
} | {
  model: 'show' | 'edit'
  field: string
  type: ${pkgid}_TypeName
} | { markdown: I18N } 
declare interface ${pkgid}_view_${viewName}_DeclData {
  ${view.refs.fields.props.map((f) => {
        return `${f.key.str}: ${f.val.type ? f.val.type.base(null) : 'invalid type'}`
      })}
}
declare interface ${pkgid}_view_${viewName}_DeclBind<S> {
  ${view.refs.fields.props.map((f) => `${f.key.str}: S`)}
}
`.trimStart())
    }
    function genDeclPkgDoc(doc: Document) {
      const docName = doc.name.str
      w.writeLine(`
declare interface ${pkgid}_document_${docName}_Decl {
  caption: I18N
  persistence: DocPersistence
  identification: 'Centralized'|'ByPeer',
  states: {
    ${doc.states.keys().map((k) => `${k}: DocState`).join('\n')}    
  }
  primaryFields: ${pkgid}_DeclDocFields
  secondaryFields: ${pkgid}_DeclDocFields
  indexes: { [name: string]: ${pkgid}_document_${docName}_Fieldname[] }
  actions: ${pkgid}_document_${docName}_DeclActions
}
declare type ${pkgid}_document_${docName}_Fieldname = ${typePipeStr(doc.refs.allFields.items.map((f) => f.path))}
declare type ${pkgid}_document_${docName}_StateName = ${typePipeStr(doc.refs.states.items.map((f) => f.path))}
declare type ${pkgid}_document_${docName}_ActionName = ${typePipeStr(doc.refs.actions.items.map((f) => f.path))}
declare interface ${pkgid}_document_${docName}_DeclActions {
  ${doc.refs.actions.items.map((a) =>
        `${a.path}: {
      from?: ${pkgid}_document_${docName}_StateName | ${pkgid}_document_${docName}_StateName[],
      to: ${pkgid}_document_${docName}_StateName | ${pkgid}_document_${docName}_StateName[],
      icon: Icon,
      description: I18N,
      run?(data: ${pkgid}_document_${docName}_Data, ${a.ref.run ? a.ref.run.params.map((p, idx) => {
          const ptxt = p.getText()
          if (idx === 0) {
            if (ptxt.includes(':')) ws.error('nao deve ter o tipo', p)
            return null
          }
          return ptxt
        }).filter((p) => p !== null).join() : ''}): ${a.ref.run ? a.ref.run.ret.getText() : 'Promise<void>'
        }
     }
    `)}      
}
declare interface ${pkgid}_document_${docName}_Data {
  ${doc.refs.allFields.items.map((f) =>
          `${f.path}:${f.ref.type.base(null)}`
        ).join('\n')}  
}
declare interface ${pkgid}_document_${docName}_Ref {
  ${doc.refs.actions.items.map((a) =>
          `${a.path}: ${a.ref.run ?
            '(' +
            a.ref.run.params.slice(1).map(p => p.getText()).join(', ') +
            ') => ' +
            a.ref.run.ret.getText()
            : '() => Promise<void>'
          }
`).join('')}}
`.trimStart())
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

declare type FunctionLevel = 'cpu' | 'io' | 'proc'

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

declare type AllPackageUris = ${typePipeStr(AllPackageUris)}

`.trimStart())
    })
  }
}

function addArrayTypes(s: string[]) {
  return s.concat(s.map(i => i + '[]'))
}