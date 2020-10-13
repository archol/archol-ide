import * as ts from 'ts-morph'

export interface SourceNode<KIND extends string> {
  kind: KIND
  sourceRef: SourceRef
}

export interface SourceNodeMapped<KIND extends string> extends SourceNode<KIND> {
  nodeMapping: Array<StringConst<any>>
}

export interface SourceRef {
  file: string,
  start: {
    pos: number,
    row: number,
    col: number,
  },
  end: {
    pos: number,
    row: number
  }
}

export interface StringConst<T extends string = string> extends SourceNode<'StringConst'> {
  str: T
}

export interface NumberConst extends SourceNode<'NumberConst'> {
  num: number
}

export interface BooleanConst extends SourceNode<'BooleanConst'> {
  bool: Boolean
}

export interface ObjectConst<T extends SourceNode<any> = SourceNode<any>> extends SourceNode<'ObjectConst'> {
  props: Array<{ key: StringConst, val: T }>
  get(key: string | StringConst): T | undefined
}

export interface ArrayConst<T extends SourceNode<any> = SourceNode<any>> extends SourceNode<'ArrayConst'> {
  items: T[]
}

export type TsNode = ts.Node | ts.SourceFile | SourceRef | SourceNode<any>

export interface Workspace extends SourceNode<'Workspace'> {
  path: string
  defaultLang: StringConst,
  apps: string[]
  ts: ts.Project
  loadApp(appName: string): Promise<Application>
  diagnostics: {
    [id: string]: {
      msg: string,
      sourceRef: SourceRef | null
      kind: 'warn' | 'error' | 'fatal'
    }
  }
  warn(errId: string, tsNode: TsNode | null, errMsg?: string): void
  error(errId: string, tsNode: TsNode | null, errMsg?: string): void
  fatal(errId: string, tsNode: TsNode | null, errMsg?: string): Error
  getRef(tsNode: TsNode): SourceRef
}

export interface Application extends SourceNode<'Application'> {
  name: StringConst
  description: I18N,
  icon: Icon,
  uses: PackageUses,
  langs: ArrayConst<StringConst>
  builders: ObjectConst<BuilderConfig>
  mappings: AppMappings
  sysroles: Roles,
  getMapped(uri: StringConst): StringConst
}

export type AppMappings = ObjectConst<StringConst>

export interface Icon extends SourceNode<'Icon'> {
  icon: string
}

export interface I18N extends SourceNode<'I18N'> {
  msg: ObjectConst<StringConst>
  //TODO params: Fields
}

export type PackageUses = ArrayConst<PackageUse>

export interface PackageUse extends SourceNode<'PackageUse'> {
  alias: StringConst
  uri: StringConst
  package: Promise<Package>
}

export interface Package extends SourceNode<'Package'> {
  uri: {
    id: StringConst
    full: StringConst
    ns: StringConst
    path: StringConst
  },
  redefines?: StringConst
  uses: PackageUses,
  types: Types,
  documents: Documents,
  processes: Processes,
  roles: Roles
  views: Views,
  functions: Functions,
  pagelets: Pagelets
  routes: Routes
  menu: Menu
}

export type Roles = ObjectConst<Role>

export interface Role extends SourceNodeMapped<'Role'> {
  name: StringConst,
  description: I18N,
  icon: Icon
}

export type Types = ObjectConst<Type>

export const basicTypes = {
  string: true,
  number: true,
  boolean: true,
  date: true
}

export interface BasicType extends SourceNode<keyof typeof basicTypes> {

}

export interface Type extends SourceNodeMapped<'Type'> {
  name: StringConst,
  base: BasicType
  validate?: Code
  format?: Code
  parse?: Code
}

export interface UseType extends SourceNode<'UseType'> {
  typepath: StringConst
  ref(): Type
}

export type Fields = ObjectConst<Field>

export interface Field extends SourceNode<'Field'> {
  name: StringConst
  type: UseType
}

export type Indexes = ObjectConst<Index>

export interface Index extends SourceNode<'Index'> {
  type: StringConst
}

export type Documents = ObjectConst<Document>

export interface Document extends SourceNodeMapped<'Document'> {
  name: StringConst,
  caption: I18N
  primaryFields: DocFields
  secondaryFields: DocFields
  indexes: DocIndexes,
  persistence: StringConst<'session' | 'persistent'>
  states: DocumentStates
  actions: DocActions
}

export type DocActions = ObjectConst<DocAction>

export interface DocAction extends SourceNodeMapped<'DocAction'> {
  name: StringConst
  from: UseDocStates
  to: UseDocStates
  icon: Icon
  description: I18N
  run?: Code
}

export type DocFields = ObjectConst<DocField>

export interface DocField extends SourceNodeMapped<'DocField'> {
  name: StringConst
  description: I18N
  type: StringConst
}

export type DocIndexes = ObjectConst<DocIndex>

export interface DocIndex extends SourceNodeMapped<'DocIndex'> {
  name: StringConst
  fields: ArrayConst<StringConst>
}

export type DocumentStates = ObjectConst<DocumentState>

export interface DocumentState extends SourceNodeMapped<'DocumentState'> {
  name: StringConst
  icon: Icon
  description: I18N
}

export interface UseDocStates extends SourceNode<'UseDocStates'> {
  states: ArrayConst<StringConst>
  ref(): DocumentState[]
}

export type Processes = ObjectConst<Process>

export interface Process extends SourceNodeMapped<'Process'> {
  name: StringConst
  title: I18N
  caption: I18N
  icon: Icon
  start: UseTask
  tasks: Tasks
  vars: ProcessVars
  roles: UseRoles
  volatile: BooleanConst
}

export interface ProcessVars extends SourceNode<'ProcessVars'> {
  input: Fields,
  output: Fields,
  local: Fields,
  get(fullname: string | StringConst): Field
}

export type UseRoles = UseLocRole | UseSysRole

export interface UseLocRole extends SourceNode<'UseLocRole'> {
  roles: ArrayConst<StringConst>
  ref(): Role[]
}

export interface UseSysRole extends SourceNode<'UseSysRole'> {
  name: StringConst
  ref(): Role
}

export interface UseTask extends SourceNode<'UseTask'> {
  name: StringConst
  ref(): Task
}

export type Tasks = ObjectConst<Task>

export type Task = UITask | SystemTask

export interface BaseTask<KIND extends string> extends SourceNodeMapped<KIND> {
  name: StringConst,
  pool?: StringConst,
  lane?: StringConst,
  roles: UseRoles,
  next: UseTask | ArrayConst<UseTask> | ObjectConst<Code | UseTask>
}

export interface UITask extends BaseTask<'UITask'> {
  useView: UseView,
}

export interface UseView extends SourceNode<'UseView'> {
  name: StringConst
  bind: BindVars,
  ref(): View
}

export interface SystemTask extends BaseTask<'SystemTask'> {
  useFunction: UseFunction
}

export interface UseFunction extends SourceNode<'UseFunction'> {
  ref(): Function
  input: BindVars,
  output: BindVars
}

export type BindVars = ArrayConst<BindVar>

export interface BindVar extends SourceNode<'BindVar'> {
  fieldpath: StringConst
  ref(): Field
}

export type Views = ObjectConst<View>

export interface View extends SourceNodeMapped<'View'> {
  name: StringConst
  content: ArrayConst<Widget>
  primaryAction?: ViewAction
  secondaryAction?: ViewAction
  othersActions?: ArrayConst<ViewAction>
  allActions?: ArrayConst<ViewAction>
}

export interface ViewAction extends SourceNode<'ViewAction'> {
  caption: I18N
  icon: Icon
  run: StringConst<"next" | "back"> | Code
  isEnabled: Code
  isVisible: Code
}

export type Widget = WidgetContent | WidgetItem

export interface WidgetContent extends SourceNode<'WidgetContent'> {
  caption: I18N,
  content?: Widget[]
}

export interface WidgetItem extends SourceNode<'WidgetItem'> {
  caption: I18N,
  readonly: BooleanConst,
  field?: StringConst,
  type?: UseType
}

export type Functions = ObjectConst<Function>

export interface FunctionLevel extends SourceNode<'FunctionLevel'> {
  level: "cpu" | "io" | "net"
}

export interface Function extends SourceNodeMapped<'Function'> {
  name: StringConst
  level: FunctionLevel
  input: Fields
  output: Fields
  code: Code
}

export interface Code extends SourceNode<'Code'> {
  params: ts.ParameterDeclaration[],
  ret: ts.Type,
  body: ts.Statement[]
}

export interface BuilderConfig extends SourceNode<'BuilderConfig'> {
  rootDir: StringConst
}

export type Pagelets = ObjectConst<Pagelet>

export interface Pagelet extends SourceNode<'Pagelet'> {
  left?: number,
  top?: number,
  right?: number,
  bottom?: number,
  drawer?: true,
  content?: true,
}

export type Routes = ObjectConst<Route>
export type Route = RouteCode | RouteRedirect

export interface RouteCode extends SourceNode<'RouteCode'> {
  path: StringConst
  code: Code
}

export interface RouteRedirect extends SourceNode<'RouteRedirect'> {
  path: StringConst
  redirect: StringConst
}

export type Menu = Array<MenuItem | '-'>

export interface MenuItem extends SourceNode<'MenuItem'> {
  caption: I18N
  icon: Icon
}

export const sysRoles: string[] = ['public', 'anonymous', 'authenticated']

export function objectConst<T extends SourceNode<any>>(sourceRef: SourceRef) {
  const props: Array<{ key: StringConst, val: T }> = []
  const ret: ObjectConst<T>
    & {
      add(key: StringConst, val: T): void
    } = {
    kind: 'ObjectConst',
    sourceRef,
    props,
    get(key: string | StringConst): T | undefined {
      if (typeof key === 'object') key = key.str
      const f = props.filter((p) => p.key.str === key)[0]
      return f && f.val
    },
    add(key, val) {
      props.push({ key, val })
    }
  }
  return ret
}

export function arrayConst<T extends SourceNode<any>>(sourceRef: SourceRef) {
  const items: Array<T> = []
  const ret: ArrayConst<T> = {
    kind: 'ArrayConst',
    sourceRef,
    items,
  }
  return ret
}
