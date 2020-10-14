import { CodeBlockWriter } from 'ts-morph';
import { Application, Package, Process, Workspace, Function, Task, View, Type, basicTypes, Document, Fields } from '../../load/types';

export async function generateDeclaration(ws: Workspace) {
  const declFileName = ws.path + '/ws/decl.d.ts'
  const sources = ws.ts.getSourceFiles()
  let declsource = sources.filter(s => s.getFilePath() === declFileName)[0]

  if (!declsource) declsource = ws.ts.createSourceFile(declFileName)
  const AllPackageUris = sources
    .map(s => s.getFilePath())
    .filter(s => s.endsWith('.pkg.ts'))
    .map((s) => s.replace(/\.pkg\.ts$/g, '').substr(ws.path.length + 4))

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
  langs: Lang[],
  builders: Builders
  pagelets: {
    [name: string]: IPagelet
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

declare interface ${appname}_Ref {
${app.uses.props.map((u) => `${u.key.str}: ${u.val.ref(u.val.uri.sourceRef).uri.id.str}_Ref,`).join('\n')}
}

declare type ${appname}_Mapping = ${Object.keys(app.mappingList).map(quote).join('|')}
declare type ${appname}_Mappings = {
  [uri in ${appname}_Mapping]?: string
}`.trimStart())
      app.allPackages.map((p) => genDeclPkg(p, w))
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
  roles (roles: Roles): ${pkgid}_DeclProcesses
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
  types (types: {${pkg.types.props.map((t) => `${t.key.str}: TypeDecl,`).join('\n')}
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

type ${pkgid}_Roles = 'public' | 'anonymous' | 'authenticated' | ${pkgid}_Role | ${pkgid}_Role[]
type ${pkgid}_Role = ${pkg.roles.props.map((r) => quote(r.key.str)).join('|')}

type ${pkgid}_TypeName = ${pkg.types.props.map((t) => t.key.str).concat(Object.keys(basicTypes)).map(quote).join('|')}
interface ${pkgid}_DeclFields {
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
  title: I18N,
  caption: I18N,
  icon: Icon,
  start: ${pkgid}_process_${procName}_Tasknames,
  volatile: boolean,
  roles: ${pkgid}_Roles,
  vars: ${pkgid}_process_${procName}_DeclVars,
  tasks: ${pkgid}_process_${procName}_DeclTasks,
}
declare type ${pkgid}_process_${procName}_Tasknames = ${process.tasks.props.map((t) => quote(t.key.str)).join('|')}
declare interface ${pkgid}_process_${procName}_Ref {
  start(): ${pkgid}_process_${procName}_Instance;
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
${['input', 'output', 'local'].map((scope) => `
declare interface ${pkgid}_process_${procName}_InstanceVars_${scope} {
  ${function () {
          const fields: Fields = (process.vars as any)[scope]
          return fields.props.map((f) => f.key.str + ': ' + f.val.type.ref(f.key).base).join('\n')
        }()}
}`).join('\n')}
declare type ${pkgid}_process_${procName}_DeclTasks = {
  [task: string]: ${pkgid}_process_${procName}_DeclTask,
}
declare type ${pkgid}_process_${procName}_DeclTask = ${pkg.functions.props.map(f => `{
    useFunction: ${pkgid}_function_${f.key.str}_Use,
    next: ${pkgid}_process_${procName}_NextTask,
}`).concat(pkg.views.props.map(f => `{
  useView: ${pkgid}_view_${f.key.str}_Use,
  next: ${pkgid}_process_${procName}_NextTask,
  roles: ${pkgid}_Roles,
}`)).join('|')
        }`.trimStart())

    }
    function genDeclPkgFunction(func: Function) {
      const funcName = func.name.str
      w.writeLine(`
declare interface ${pkgid}_function_${funcName}_Decl {
  level: FunctionLevel
  input: ${pkgid}_DeclFields,
  output: ${pkgid}_DeclFields,
  code (vars: { input: ${pkgid}_function_${funcName}_DeclRef, output: ${pkgid}_function_${funcName}_DeclRef }): void
}
`.trimStart())
    }
    function genDeclPkgView(view: View) {
      const viewName = view.name.str
      w.writeLine(`
declare interface ${pkgid}_view_${viewName}_Decl {
  content: ${pkgid}_view_${viewName}_DeclContent
  primaryAction?: IAction<${pkgid}_view_${viewName}_DeclData>
  secondaryAction?: IAction<${pkgid}_view_${viewName}_DeclData>
  otherActions?: Array<IAction<${pkgid}_view_${viewName}_DeclData>>
}
declare type ${pkgid}_view_${viewName}_DeclContent = Array<{
  model: 'show' | 'edit'
  field: string
  type: ${pkgid}_TypeName
}>
declare interface ${pkgid}_view_${viewName}_DeclData {
  firstName: string
}
declare interface ${pkgid}_view_${viewName}_DeclBind<S> {
  firstName: S
}
`.trimStart())
    }
    function genDeclPkgDoc(doc: Document) {
      const docName = doc.name.str
      w.writeLine(`
declare interface ${pkgid}_doc_${docName}_Decl {
  persistence: DocPersistence
  states: {
    partial: DocState
    complete: DocState
  }
  primaryFields: ${pkgid}_DeclFields
  secondaryFields: ${pkgid}_DeclFields
  indexes: { [name: string]: Itest_archol_com_hwDOCOLNAMEnomes[] }
  actions: Itest_archol_com_hwDOCACTIONSnomes  
}
declare interface ${pkgid}_doc_${docName}_Ref {
  x
}
`.trimStart())
      //process.tasks.props.forEach
    }
  }
  function declareGlobals() {
    declsource.addStatements((w) => {
      w.write(`
/* eslint-disable */

declare type Icon = string
declare type GUID = '$GUID'

declare type I18N = string | {
  [lang in Lang]?: string
}

declare type Lang = 'pt' | 'en'

declare interface BuilderConfig {  
}

declare type Roles = {
  [roleName: string]: Role
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

declare type BasicTypes = "string" | "number" | "boolean" | "date"

declare type DocPersistence = 'session' | 'persistent'
declare interface DocState {
  icon: Icon
  description: I18N
}

declare type FunctionLevel = 'cpu' | 'io' | 'proc'

declare type Menu = { 
  caption: I18N
  icon: Icon
}

declare type IPagelet = {
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

declare interface Builders { "node-tsx-deepstream": BuilderConfig }

declare type AllPackageUris = ${AllPackageUris.map(quote).join('|')}

declare type TypeDecl = ${Object.keys(basicTypes).map((b) => {
        const js = b === 'date' ? 'Date' : b
        return `{
  base: ${quote(b)}
  validate?(this: void, val: ${js}): string | false
  format?(this: void, val: ${js}): string
  parse?(this: void, str: string): ${js}
}`.trim()
      }
      ).join('|')}}

`.trimStart())
    })
  }
}

function quote(s: string) {
  return '"' + s + '"'
}
