import * as ts from 'ts-morph'

export type SourceNodeKind = 'Application' | 'Package' | 'StringConst' | 'NumberConst' | 'BooleanConst' |
  'ObjectConst' | 'ArrayConst' | 'Workspace' | 'Application' | 'Icon' | 'I18N' | 'PackageUse' | 'Package' | 'Role' |
  'BaseType' | 'NormalType' | 'EnumType' | 'EnumOption' | 'ComplexType' | 'ArrayType' | 'UseType1' | 'UseTypeAsArray' |
  'Field' | 'Index' | 'Document' | 'DocAction' | 'DocField' | 'DocIndex' | 'DocumentState' | 'UseDocStates' |
  'Process' | 'ProcessVars' | 'UseLocRole' | 'UseSysRole' | 'UseTask' | 'UITask' | 'UseView' | 'SystemTask' |
  'UseFunction' | 'BindVar' | 'View' | 'ViewAction' | 'WidgetContent' | 'WidgetItem' | 'FunctionLevel' |
  'Function' | 'Code' | 'BuilderConfig' | 'Pagelet' | 'RouteCode' | 'RouteRedirect' | 'MenuItem' | 'MenuItemSeparator'

export function isSourceNode(node: any): node is SourceNode<any> {
  return typeof node === 'object' && typeof node.kind === 'string' && typeof node.sourceRef === 'object'
}

export interface SourceNode<KIND extends SourceNodeKind> {
  kind: KIND
  sourceRef: SourceRef
}

export interface SourceNodeWithName<KIND extends SourceNodeKind> extends SourceNode<KIND> {
  name: StringConst
}

export interface SourceNodeMapped<KIND extends SourceNodeKind> extends SourceNodeWithName<KIND> {
  nodeMapping: {
    id: string
  }
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
    col: number,
  }
}

export const unkownErrorPos: SourceRef = {
  file: 'unkown error position',
  start: { pos: 0, row: 0, col: 0 },
  end: { pos: 0, row: 0, col: 0 },
}

export function isStringConst(node: any): node is StringConst {
  return node && node.kind === 'StringConst'
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

export function isObjectConst(node: any): node is ObjectConst {
  return node && node.kind === 'ObjectConst'
}

export interface ObjectConst<T extends SourceNode<any> = SourceNode<any>> extends SourceNode<'ObjectConst'> {
  props: Array<{ key: StringConst, val: T }>
  get(key: string | StringConst): T | undefined
  keys(): string[]
  map<U>(callbackfn: (value: T, key: StringConst) => U, thisArg?: any): U[];
}

export function isArrayConst(node: any): node is ArrayConst {
  return node && node.kind === 'ArrayConst'
}

export interface ArrayConst<T extends SourceNode<any> = SourceNode<any>> extends SourceNode<'ArrayConst'> {
  items: T[]
}

export type TsNode = ts.Node | ts.SourceFile | SourceRef | SourceNode<any> | Array<ts.Node | ts.SourceFile | SourceRef | SourceNode<any>>

export interface Workspace extends SourceNode<'Workspace'> {
  path: string
  defaultLang: StringConst,
  apps: string[]
  ts: ts.Project
  loadApp(appName: string): Promise<Application>
  diagnostics: {
    [id: string]: {
      msg: string,
      sourceRefs: SourceRef[]
      kind: 'warn' | 'error' | 'fatal'
      archol: Error
    }
  }
  warn(errId: string, tsNode: TsNode | TsNode[], errMsg?: string): void
  error(errId: string, tsNode: TsNode | TsNode[], errMsg?: string): void
  fatal(errId: string, tsNode: TsNode | TsNode[], errMsg?: string): Error
  getRef(tsNode: TsNode): SourceRef
  getRefs(tsNode: TsNode | TsNode[]): SourceRef[]
  allApplications(): string[]
  allPackages(): string[]
}

export interface Application extends SourceNode<'Application'> {
  name: StringConst
  description: I18N,
  icon: Icon,
  uses: PackageUses,
  allPackages: Package[],
  langs: ArrayConst<StringConst>
  builders: ObjectConst<BuilderConfig>
  pagelets: ObjectConst<Pagelet>
  menu: Menu
  routes: Routes
  mappings: AppMappings
  mappingList: { [id: string]: SourceNodeMapped<any> }
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

export type PackageUses = ObjectConst<PackageUse>

export interface PackageUse extends SourceNode<'PackageUse'> {
  alias: StringConst
  uri: StringConst
  ref(sourceRef: TsNode): Package
  promise: Promise<Package>
}

export function isPackage(node: any): node is Package {
  return node && node.kind === 'Package'
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
  refs: {
    baseTypes: PackageRefs<BaseType<any>>,
    types: PackageRefs<Type>,
    documents: PackageRefs<Document>,
    processes: PackageRefs<Process>,
    roles: PackageRefs<Role>,
    views: PackageRefs<View>,
    functions: PackageRefs<Function>,
  }
  types: Types,
  documents: Documents,
  processes: Processes,
  roles: Roles
  views: Views,
  functions: Functions,
  routes: Routes
}

export type Roles = ObjectConst<Role>
export type Role = RoleDef | RoleGroup

export interface RoleDef extends SourceNodeMapped<'Role'> {
  description: I18N,
  icon: Icon
}

export type RoleGroup = ArrayConst<StringConst>

export type Types = ObjectConst<Type>

export const normalTypes = {
  enum: false,
  complex: false,
  array: false,
  string: true,
  number: true,
  boolean: true,
  date: true
}

export type BasicTypesOnly = Exclude<Exclude<Exclude<keyof typeof normalTypes, 'enum'>, 'complex'>, 'array'>
export const basicTypes3: {
  [k in BasicTypesOnly]: NormalType
} = {
  string: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'string', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      id: 'string'
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'string'
    }
  },
  number: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'number', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      id: 'number'
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'number'
    }
  },
  boolean: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'boolean', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      id: 'boolean'
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'boolean'
    }
  },
  date: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'date', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      id: 'date'
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'date'
    }
  }
}

export interface BaseType<BASE extends keyof typeof normalTypes> extends SourceNode<'BaseType'> {
  base: BASE
  enumOptions: false | ObjectConst<EnumOption>
  complexFields: false | Fields
  arrayType: false | UseType
}

export type Type = NormalType | EnumType | ComplexType | ArrayType

export interface TypeBase<KIND extends SourceNodeKind, BASE extends keyof typeof normalTypes> extends SourceNodeMapped<KIND> {
  validate?: Code
  format?: Code
  parse?: Code
  base: () => BaseType<BASE>
}
export interface NormalType extends TypeBase<'NormalType', BasicTypesOnly> {
}
export interface EnumType extends TypeBase<'EnumType', 'enum'> {
  options: ObjectConst<EnumOption>
}

export interface EnumOption extends SourceNodeWithName<'EnumOption'> {
  value: StringConst
  description: I18N
  icon: Icon
}
export interface ComplexType extends TypeBase<'ComplexType', 'complex'> {
  fields: Fields
}
export interface ArrayType extends TypeBase<'ArrayType', 'array'> {
  itemType: UseType
}

export type UseType = UseType1 | UseTypeAsArray
export interface UseType1 extends SourceNode<'UseType1'> {
  type: StringConst
  ref(sourceRef: TsNode | null): Type
  base(sourceRef: TsNode | null): string
}
export interface UseTypeAsArray extends SourceNode<'UseTypeAsArray'> {
  itemType: UseType
  ref(sourceRef: TsNode | null): ArrayType
  base(sourceRef: TsNode | null): string
}

export type Fields = ObjectConst<Field>

export interface Field extends SourceNodeWithName<'Field'> {
  description?: I18N
  type: UseType
}

export type Indexes = ObjectConst<Index>

export interface Index extends SourceNode<'Index'> {
  type: StringConst
}

export type Documents = ObjectConst<Document>

export function isDocument(node: any): node is Document {
  return node && node.kind === 'Document'
}

export interface Document extends SourceNodeMapped<'Document'> {
  identification: StringConst<'Centralized' | 'ByPeer'>
  caption: I18N
  primaryFields: DocFields
  secondaryFields: DocFields
  indexes: DocIndexes,
  persistence: StringConst<'session' | 'persistent'>
  states: DocumentStates
  actions: DocActions
  refs: {
    allFields: PackageRefs<DocField>
    primaryFields: PackageRefs<DocField>
    secondaryFields: PackageRefs<DocField>
    indexes: PackageRefs<DocIndex>
    states: PackageRefs<DocumentState>
    actions: PackageRefs<DocAction>
  }
}

export type DocActions = ObjectConst<DocAction>

export interface DocAction extends SourceNodeMapped<'DocAction'> {
  from: UseDocStates
  to: UseDocStates
  icon: Icon
  description: I18N
  run?: Code
}

export type DocFields = ObjectConst<DocField>

export interface DocField extends SourceNodeMapped<'DocField'> {
  description: I18N
  type: UseType
}

export type DocIndexes = ObjectConst<DocIndex>

export interface DocIndex extends SourceNodeMapped<'DocIndex'> {
  fields: ArrayConst<StringConst>
}

export type DocumentStates = ObjectConst<DocumentState>

export interface DocumentState extends SourceNodeMapped<'DocumentState'> {
  icon: Icon
  description: I18N
}

export interface UseDocStates extends SourceNode<'UseDocStates'> {
  states: ArrayConst<StringConst>
  ref(sourceRef: TsNode): DocumentState[]
}

export type Processes = ObjectConst<Process>

export function isProcess(node: any): node is Process {
  return node && node.kind === 'Process'
}

export interface Process extends SourceNodeMapped<'Process'> {
  title: I18N
  caption: I18N
  icon: Icon
  start: UseTask
  tasks: Tasks
  vars: ProcessVars
  roles: UseRoles
  volatile: BooleanConst
  refs: {
    vars: PackageRefs<Field>
  }
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
  ref(sourceRef: TsNode): Role[]
}

export interface UseSysRole extends SourceNode<'UseSysRole'> {
  role: StringConst
  ref(sourceRef: TsNode): Role
}

export interface UseTask extends SourceNode<'UseTask'> {
  task: StringConst
  ref(sourceRef: TsNode): Task
}

export type Tasks = ObjectConst<Task>

export type Task = UITask | SystemTask

export interface BaseTask<KIND extends SourceNodeKind> extends SourceNodeMapped<KIND> {
  pool?: StringConst,
  lane?: StringConst,
  roles: UseRoles,
  next: UseTask | ArrayConst<UseTask> | ObjectConst<Code | UseTask>
}

export interface UITask extends BaseTask<'UITask'> {
  useView: UseView,
}

export interface UseView extends SourceNode<'UseView'> {
  view: StringConst
  bind: BindVars,
  ref(sourceRef: TsNode): View
}

export interface SystemTask extends BaseTask<'SystemTask'> {
  useFunction: UseFunction
}

export interface UseFunction extends SourceNode<'UseFunction'> {
  function: StringConst
  input: BindVars,
  output: BindVars
  ref(sourceRef: TsNode): Function
}

export type BindVars = ObjectConst<BindVar>

export interface BindVar extends SourceNode<'BindVar'> {
  fieldpath: StringConst
  ref(sourceRef: TsNode): Field
}

export type Views = ObjectConst<View>

export function isView(node: any): node is View {
  return node && node.kind === 'View'
}

export interface View extends SourceNodeMapped<'View'> {
  content: ArrayConst<Widget>
  primaryAction?: ViewAction
  secondaryAction?: ViewAction
  othersActions?: ArrayConst<ViewAction>
  allActions?: ArrayConst<ViewAction>
  refs: {
    fields: PackageRefs<Field>
  }
}

export interface ViewAction extends SourceNode<'ViewAction'> {
  caption: I18N
  icon: Icon
  run: StringConst<"next" | "back"> | Code
  isEnabled: Code
  isVisible: Code
}

export function isWidgetContent(node: any): node is WidgetContent {
  return node && node.kind === 'WidgetContent'
}

export type Widget = WidgetContent | WidgetItem

export interface WidgetContent extends SourceNode<'WidgetContent'> {
  caption: I18N,
  content: Widget[]
}

export interface WidgetItem extends SourceNode<'WidgetItem'> {
  caption: I18N,
  model: StringConst<"show" | "edit">,
  field: StringConst,
  type: UseType
}

export type Functions = ObjectConst<Function>

export interface FunctionLevel extends SourceNode<'FunctionLevel'> {
  level: "cpu" | "io" | "net"
}

export interface Function extends SourceNodeMapped<'Function'> {
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
  name: StringConst,
  left?: NumberConst,
  top?: NumberConst,
  right?: NumberConst,
  bottom?: NumberConst,
  drawer?: BooleanConst,
  content?: BooleanConst,
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

export type Menu = ArrayConst<MenuItem | MenuItemSeparator>

export interface MenuItem extends SourceNode<'MenuItem'> {
  caption: I18N
  icon: Icon
  run: StringConst | Code
}

export interface MenuItemSeparator extends SourceNode<'MenuItemSeparator'> {
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
    map(fn) {
      return props.map((p) => fn(p.val, p.key))
    },
    keys() {
      return props.map((p) => p.key.str)
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

export interface PackageRefs<T extends SourceNode<any>> {
  items: Array<PackageRef<T>>
}

export interface PackageRef<T extends SourceNode<any>> {
  path: string
  ref: T
}
export type SourceNodeType<KIND extends SourceNodeKind> = KIND extends 'Application' ? Application :
  KIND extends 'Package' ? Package :
  KIND extends 'StringConst' ? StringConst :
  KIND extends 'NumberConst' ? NumberConst :
  KIND extends 'BooleanConst' ? BooleanConst :
  KIND extends 'ObjectConst' ? ObjectConst :
  KIND extends 'ArrayConst' ? ArrayConst :
  KIND extends 'Workspace' ? Workspace :
  KIND extends 'Application' ? Application :
  KIND extends 'Icon' ? Icon :
  KIND extends 'I18N' ? I18N :
  KIND extends 'PackageUse' ? PackageUse :
  KIND extends 'Package' ? Package :
  KIND extends 'Role' ? Role :
  KIND extends 'BaseType' ? BaseType<any> :
  KIND extends 'NormalType' ? NormalType :
  KIND extends 'EnumType' ? EnumType :
  KIND extends 'EnumOption' ? EnumOption :
  KIND extends 'ComplexType' ? ComplexType :
  KIND extends 'ArrayType' ? ArrayType :
  KIND extends 'UseType1' ? UseType1 :
  KIND extends 'UseTypeAsArray' ? UseTypeAsArray :
  KIND extends 'Field' ? Field :
  KIND extends 'Index' ? Index :
  KIND extends 'Document' ? Document :
  KIND extends 'DocAction' ? DocAction :
  KIND extends 'DocField' ? DocField :
  KIND extends 'DocIndex' ? DocIndex :
  KIND extends 'DocumentState' ? DocumentState :
  KIND extends 'UseDocStates' ? UseDocStates :
  KIND extends 'Process' ? Process :
  KIND extends 'ProcessVars' ? ProcessVars :
  KIND extends 'UseLocRole' ? UseLocRole :
  KIND extends 'UseSysRole' ? UseSysRole :
  KIND extends 'UseTask' ? UseTask :
  KIND extends 'UITask' ? UITask :
  KIND extends 'UseView' ? UseView :
  KIND extends 'SystemTask' ? SystemTask :
  KIND extends 'UseFunction' ? UseFunction :
  KIND extends 'BindVar' ? BindVar :
  KIND extends 'View' ? View :
  KIND extends 'ViewAction' ? ViewAction :
  KIND extends 'WidgetContent' ? WidgetContent :
  KIND extends 'WidgetItem' ? WidgetItem :
  KIND extends 'FunctionLevel' ? FunctionLevel :
  KIND extends 'Function' ? Function :
  KIND extends 'Code' ? Code :
  KIND extends 'BuilderConfig' ? BuilderConfig :
  KIND extends 'Pagelet' ? Pagelet :
  KIND extends 'RouteCode' ? RouteCode :
  KIND extends 'RouteRedirect' ? RouteRedirect :
  KIND extends 'MenuItem' ? MenuItem :
  KIND extends 'MenuItemSeparator' ? MenuItemSeparator :
  unknown
