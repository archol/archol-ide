import * as tsm from 'ts-morph'
import * as ts from 'typescript'

export type SourceNodeArrayKind = 'AppLanguages' | 'RoleGroup' | 'DocIndexFields' |
  'UsedDocStates' | 'AllowLocRoleList' | 'Widgets' | 'otherActions' | 'allActions' |
  'UseTaskForks' | 'Menu' | 'RoutePath' | 'TestingDocumentItems'

export type SourceNodeRefsKind = 'RefTypes' | 'RefDocuments' | 'RefProcesses' | 'RefRoles' | 'RefViews' |
  'RefOperations' | 'RefPrimaryFields' | 'RefSecondaryFields' | 'RefDocIndexes' | 'RefDocStates' | 'RefDocAction'

export type SourceNodeObjectKind = 'AppBuilders' | 'Pagelets' | 'AppMappings' |
  'I18NMsg' | 'ComponentUses' | 'RoleDefs' | 'RoleGroups' | 'Types' | 'EnumOptions' | 'Fields' | 'Documents' |
  'DocActions' | 'DocFields' | 'DocIndexes' | 'DocumentStates' | 'Processes' | 'Tasks' |
  'BindVars' | 'Views' | 'Operations' | 'Routes' |
  'TestingScenarios' | 'TestingCases' | 'TestingDocuments' |
  SourceNodeRefsKind

export type SourceNodeWidgetKind = 'WidgetEntry' | 'WidgetMarkdown'

export type SourceNodeKind = 'Application' | 'Component' | 'StringConst' | 'DateConst' | 'NumberConst' | 'BooleanConst' |
  'Workspace' | 'Application' | 'Icon' | 'I18N' | 'ComponentUse' | 'Component' | 'RoleDef' |
  'BaseType' | 'NormalType' | 'EnumType' | 'EnumOption' | 'ComplexType' | 'ArrayType' | 'UseType1' | 'UseTypeAsArray' |
  'Field' | 'Document' | 'DocAction' | 'DocField' | 'DocIndex' | 'DocumentState' | 'UseDocStates' |
  'Process' | 'ProcessUse' | 'ProcessVars' | 'AllowLocRoles' | 'AllowSysRole' | 'UseTask' | 'UITask' | 'UseView' | 'SystemTask' |
  'UseOperation' | 'BindVar' | 'View' | 'ViewAction' | 'WidgetContent' | 'WidgetEntry' | 'WidgetMarkdown' | 'OperationLevel' |
  'Operation' | 'Code' | 'BuilderConfig' | 'Pagelet' | 'RouteCode' | 'RouteRedirect' | 'MenuItem' | 'MenuItemSeparator' |
  'RoutePathItem' | 'TestingScenario' | 'TestingDocument' | 'TestingDocumentItem' |
  //
  SourceNodeArrayKind | SourceNodeObjectKind | SourceNodeWidgetKind


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

export interface NodeMapping {
  parent: SourceNodeMapped<any>
  name: string
  uri(sep?: string): string
  path: Array<SourceNodeMapped<any>>
}

export interface SourceNodeMapped<KIND extends SourceNodeKind> extends SourceNodeWithName<KIND> {
  nodeMapping: NodeMapping
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

export function isDateConst(node: any): node is DateConst {
  return node && node.kind === 'DateConst'
}

export interface DateConst extends SourceNode<'DateConst'> {
  iso: string
}

export interface NumberConst extends SourceNode<'NumberConst'> {
  num: number
}

export function isBooleanConst(node: any): node is BooleanConst {
  return node && node.kind === 'BooleanConst'
}
export interface BooleanConst extends SourceNode<'BooleanConst'> {
  bool: Boolean
}

export function isObjectConst<KIND extends SourceNodeObjectKind>(node: any): node is ObjectConst<KIND> {
  return node && typeof node.kind === 'string' && typeof node.props === 'object'
}

export function isObjectConstProp<KIND extends SourceNodeObjectKind, T extends SourceNode<any> = SourceNode<any>>(obj: any): obj is ObjectConstProp<KIND, T> {
  return obj && obj.key && obj.val
}

export interface ObjectConstProp<KIND extends SourceNodeObjectKind, T extends SourceNode<any> = SourceNode<any>> {
  key: StringConst,
  val: T
}

export interface ObjectConst<KIND extends SourceNodeObjectKind, T extends SourceNode<any> = SourceNode<any>> extends SourceNode<KIND> {
  props: Array<ObjectConstProp<KIND, T>>
  get(key: string | StringConst): T | undefined
  keys(): string[]
  map<U>(callbackfn: (value: T, key: StringConst) => U, thisArg?: any): U[];
  merge<KIND2 extends SourceNodeObjectKind>(other: ObjectConst<KIND2, T>): ObjectConst<KIND | KIND2, T>
}

export function isArrayConst<KIND extends SourceNodeArrayKind>(node: any): node is ArrayConst<KIND> {
  return node && typeof node.kind === 'string' && Array.isArray(node.items)
}

export interface ArrayConst<KIND extends SourceNodeArrayKind, T extends SourceNode<any> = SourceNode<any>> extends SourceNode<KIND> {
  items: T[]
}

export type TsNode =
  ts.Node | ts.SourceFile |
  tsm.Node | tsm.SourceFile |
  SourceRef | SourceNode<any> |
  Array<
    ts.Node | ts.SourceFile |
    tsm.Node | tsm.SourceFile
    | SourceRef | SourceNode<any>>

export interface Workspace extends SourceNode<'Workspace'> {
  path: string
  defaultLang: StringConst,
  apps: string[]
  ts: tsm.Project
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
  allComponents(): string[]
}

export interface Application extends SourceNodeMapped<'Application'> {
  name: StringConst
  description: I18N,
  icon: Icon,
  uses: ComponentUses,
  allComponents: Component[],
  start: ProcessUse,
  login: ProcessUse,
  error: ProcessUse,
  langs: ArrayConst<'AppLanguages', StringConst>
  builders: ObjectConst<'AppBuilders', BuilderConfig>
  pagelets: Pagelets
  menu: Menu
  routes: Routes
  mappings: AppMappings
  mappingList: { [id: string]: { parent: null | SourceNodeMapped<any>, node: SourceNodeMapped<any> } }
  sysroles: RoleDefs,

  getMapped(uri: StringConst): StringConst
}

export type AppMappings = ObjectConst<'AppMappings', StringConst>

export interface Icon extends SourceNode<'Icon'> {
  icon: string
}

export interface I18N extends SourceNode<'I18N'> {
  msg: ObjectConst<'I18NMsg', StringConst>
  //TODO params: Fields
}

export type ComponentUses = ObjectConst<'ComponentUses', ComponentUse>

export interface ComponentUse extends SourceNode<'ComponentUse'> {
  alias: StringConst
  uri: StringConst
  ref(sourceRef: TsNode): Component
  promise: Promise<Component>
}

export function isComponent(node: any): node is Component {
  return node && node.kind === 'Component'
}

export interface Component extends SourceNodeMapped<'Component'> {
  uri: {
    id: StringConst
    full: StringConst
    ns: StringConst
    path: StringConst
  },
  redefines?: StringConst
  uses: ComponentUses,
  refs: {
    baseTypes: ComponentRefs<BaseType<any>>,
    types: ComponentRefs<Type>,
    documents: ComponentRefs<Document>,
    processes: ComponentRefs<Process>,
    roleDefs: ComponentRefs<RoleDef>,
    roleGroups: ComponentRefs<RoleGroup>,
    views: ComponentRefs<View>,
    operations: ComponentRefs<Operation>,
  }
  types: Types,
  documents: Documents,
  processes: Processes,
  roleDefs: RoleDefs
  roleGroups: RoleGroups
  views: Views,
  operations: Operations,
  routes: Routes
  testing: TestingScenarios
}

export type RoleDefs = ObjectConst<'RoleDefs', RoleDef>

export function isRoleDef(o: any): o is RoleDef {
  return o && o.kind === 'RoleDef'
}

export interface RoleDef extends SourceNodeMapped<'RoleDef'> {
  description: I18N,
  icon: Icon,
  defComp: Component
}

export type RoleGroups = ObjectConst<'RoleGroups', RoleGroup>
export function isRoleGroups(o: any): o is RoleGroups {
  return o.kind === 'RoleGroups'
}
export interface RoleGroup extends SourceNodeMapped<'RoleGroup'> {
  allow: AllowRoles,
  defComp: Component
}

export type Types = ObjectConst<'Types', Type>

export const normalTypes = {
  invalid: true,
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
  invalid: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'invalid', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      parent: null as any,
      name: 'invalid',
      uri: () => 'invalid',
      path: []
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'invalid'
    },
    defComp: null as any
  },
  string: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'string', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      parent: null as any,
      name: 'string',
      uri: () => 'string',
      path: []
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'string'
    },
    defComp: null as any
  },
  number: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'number', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      parent: null as any,
      name: 'number',
      uri: () => 'number',
      path: []
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'number'
    },
    defComp: null as any
  },
  boolean: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'boolean', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      parent: null as any,
      name: 'boolean',
      uri: () => 'boolean',
      path: []
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'boolean'
    },
    defComp: null as any
  },
  date: {
    kind: 'NormalType',
    sourceRef: unkownErrorPos,
    base: () => ({ kind: 'BaseType', sourceRef: unkownErrorPos, base: 'date', enumOptions: false, complexFields: false, arrayType: false }),
    nodeMapping: {
      parent: null as any,
      name: 'date',
      uri: () => 'date',
      path: []
    },
    name: {
      kind: 'StringConst',
      sourceRef: unkownErrorPos,
      str: 'date'
    },
    defComp: null as any
  }
}

export interface BaseType<BASE extends keyof typeof normalTypes> extends SourceNode<'BaseType'> {
  base: BASE
  enumOptions: false | ObjectConst<'EnumOptions', EnumOption>
  complexFields: false | Fields
  arrayType: false | UseType
}

export function isTypeBase<KIND extends SourceNodeKind, BASE extends keyof typeof normalTypes>(
  o: any
): o is TypeBase<KIND, BASE> {
  if (o && o.base) {
    return (o.kind === 'NormalType') ||
      (o.kind === 'EnumType') ||
      (o.kind === 'ComplexType') ||
      (o.kind === 'ArrayType')
  }
  return false
}

export type Type = NormalType | EnumType | ComplexType | ArrayType

export interface TypeBase<KIND extends SourceNodeKind, BASE extends keyof typeof normalTypes> extends SourceNodeMapped<KIND> {
  validate?: Code
  format?: Code
  parse?: Code
  base: () => BaseType<BASE>,
  defComp: Component
}
export interface NormalType extends TypeBase<'NormalType', BasicTypesOnly> {
}
export interface EnumType extends TypeBase<'EnumType', 'enum'> {
  options: ObjectConst<'EnumOptions', EnumOption>
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

export type Fields = ObjectConst<'Fields', Field>

export interface Field extends SourceNodeWithName<'Field'> {
  description?: I18N
  type: UseType
}

export type Documents = ObjectConst<'Documents', Document>

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
  actions: DocActions,
  defComp: Component
  refs: {
    allFields: ComponentRefs<DocField>
    primaryFields: ComponentRefs<DocField>
    secondaryFields: ComponentRefs<DocField>
    indexes: ComponentRefs<DocIndex>
    states: ComponentRefs<DocumentState>
    actions: ComponentRefs<DocAction>
  }
}

export type DocActions = ObjectConst<'DocActions', DocAction>

export interface DocAction extends SourceNodeMapped<'DocAction'> {
  from: UseDocStates
  to: UseDocStates
  icon: Icon
  description: I18N
  run?: Code
}

export type DocFields = ObjectConst<'DocFields', DocField>

export interface DocField extends SourceNodeMapped<'DocField'> {
  description: I18N
  type: UseType
}

export type DocIndexes = ObjectConst<'DocIndexes', DocIndex>

export interface DocIndex extends SourceNodeMapped<'DocIndex'> {
  fields: ArrayConst<'DocIndexFields', StringConst>
}

export type DocumentStates = ObjectConst<'DocumentStates', DocumentState>

export interface DocumentState extends SourceNodeMapped<'DocumentState'> {
  icon: Icon
  description: I18N
}

export interface UseDocStates extends SourceNode<'UseDocStates'> {
  states: ArrayConst<'UsedDocStates', StringConst>
  ref(sourceRef: TsNode): DocumentState[]
}

export type Processes = ObjectConst<'Processes', Process>

export function isProcess(node: any): node is Process {
  return node && node.kind === 'Process'
}

export interface Process extends SourceNodeMapped<'Process'> {
  title: I18N | Code
  caption: I18N
  icon: Icon
  start: UseTask
  tasks: Tasks
  vars: ProcessVars
  allow: AllowRoles
  volatile: BooleanConst
  singleton: BooleanConst
  defComp: Component
  refs: {
    component: Component
    vars: ComponentRefs<Field>
  }
}

export interface ProcessUse extends StringConst<'ProcessUse'> {
  ref(sourceRef: TsNode): Process
}

export interface ProcessVars extends SourceNode<'ProcessVars'> {
  input: Fields,
  output: Fields,
  local: Fields,
  get(fullname: string | StringConst): Field
}

export type AllowRoles = AllowLocRoles | AllowSysRole
export type AnyRole = RoleDef | RoleGroup

export interface AllowLocRoles extends SourceNode<'AllowLocRoles'> {
  allow: ArrayConst<'AllowLocRoleList', StringConst>
  ref(sourceRef: TsNode): Array<{ comp: Component, role: AnyRole }>
}

export interface AllowSysRole extends SourceNode<'AllowSysRole'> {
  role: StringConst
  ref(sourceRef: TsNode): RoleDef
}

export interface UseTask extends SourceNode<'UseTask'> {
  task: StringConst
  condition?: Code
  ref(sourceRef: TsNode): Task
}

export type Tasks = ObjectConst<'Tasks', Task>

export type Task = UITask | SystemTask

export interface BaseTask<KIND extends SourceNodeKind> extends SourceNodeMapped<KIND> {
  pool?: StringConst,
  lane?: StringConst,
  allow: AllowRoles,
  next: UseTaskForks
}

export type UseTaskForks = ArrayConst<'UseTaskForks', UseTask>

export interface UITask extends BaseTask<'UITask'> {
  useView: UseView,
}

export interface UseView extends SourceNode<'UseView'> {
  view: StringConst
  bind: BindVars,
  ref(sourceRef: TsNode): View
}

export interface SystemTask extends BaseTask<'SystemTask'> {
  useOperation: UseOperation
}

export interface UseOperation extends SourceNode<'UseOperation'> {
  operation: StringConst
  input: BindVars,
  output: BindVars
  ref(sourceRef: TsNode): Operation
}

export type BindVars = ObjectConst<'BindVars', BindVar>

export interface BindVar extends SourceNode<'BindVar'> {
  fieldpath: StringConst
  ref(sourceRef: TsNode): Field
}

export type Views = ObjectConst<'Views', View>

export function isView(node: any): node is View {
  return node && node.kind === 'View'
}

export interface View extends SourceNodeMapped<'View'> {
  title: I18N | Code
  content: WidgetContent
  primaryAction?: ViewAction
  secondaryAction?: ViewAction
  otherActions?: ArrayConst<'otherActions', ViewAction>
  allActions?: ArrayConst<'allActions', ViewAction>
  defComp: Component
  refs: {
    fields: Fields
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

export interface WidgetItem<KIND extends SourceNodeWidgetKind> extends SourceNode<KIND> {
  grid?: StringConst
  widgetFields(): Fields
}

export function isWidgetItem<KIND extends SourceNodeWidgetKind>(node: any): node is WidgetItem<KIND> {
  return node && typeof node.widgetFields === 'object'
}

export interface WidgetContent extends SourceNode<'WidgetContent'> {
  caption?: I18N,
  widgets: ArrayConst<'Widgets', WidgetContent | WidgetItem<any>>
}

export function isWidgetEntry(node: any): node is WidgetEntry {
  return node && node.kind === 'WidgetEntry'
}

export interface WidgetEntry extends WidgetItem<'WidgetEntry'> {
  caption: I18N,
  model: StringConst<"show" | "edit">,
  field: StringConst,
  type: UseType
}

export function isWidgetMarkdown(node: any): node is WidgetMarkdown {
  return node && node.kind === 'WidgetMarkdown'
}

export interface WidgetMarkdown extends WidgetItem<'WidgetMarkdown'> {
  markdown: I18N,
}

export type Operations = ObjectConst<'Operations', Operation>

export interface OperationLevel extends SourceNode<'OperationLevel'> {
  level: "cpu" | "io" | "net"
}

export interface Operation extends SourceNodeMapped<'Operation'> {
  title: I18N
  level: OperationLevel
  cancelabled: BooleanConst
  input: Fields
  output: Fields
  code: Code
  defComp: Component
}

export function isCodeNode(node: any): node is Code {
  return node && node.kind === 'Code'
}

export interface Code extends SourceNode<'Code'> {
  async: boolean
  params: tsm.ParameterDeclaration[],
  ret: tsm.Type,
  body: tsm.Statement[]
  fn: tsm.FunctionDeclaration | tsm.ArrowFunction | tsm.MethodDeclaration | tsm.FunctionExpression
}

export interface BuilderConfig extends SourceNode<'BuilderConfig'> {
  rootDir: StringConst
}

export type Pagelets = ObjectConst<'Pagelets', Pagelet>

export interface Pagelet extends SourceNode<'Pagelet'> {
  name: StringConst,
  left?: NumberConst,
  top?: NumberConst,
  right?: NumberConst,
  bottom?: NumberConst,
  drawer?: BooleanConst,
  content?: BooleanConst,
}

export type Routes = ObjectConst<'Routes', Route>
export type Route = RouteCode | RouteRedirect

export interface RoutePathItem extends StringConst<'RoutePathItem'> {
  type?: string
}

export interface RouteCode extends SourceNode<'RouteCode'> {
  path: ArrayConst<'RoutePath', RoutePathItem>
  code: Code
}

export interface RouteRedirect extends SourceNode<'RouteRedirect'> {
  path: ArrayConst<'RoutePath', RoutePathItem>
  redirect: StringConst
}

export type Menu = ArrayConst<'Menu', MenuItem | MenuItemSeparator>

export interface MenuItem extends SourceNode<'MenuItem'> {
  caption: I18N
  icon: Icon
  allow: AllowRoles
  run: StringConst | Code
}

export interface MenuItemSeparator extends SourceNode<'MenuItemSeparator'> {
}

export const sysRoles: string[] = ['public', 'anonymous', 'authenticated']

export function objectConst<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(kind: KIND, sourceRef: SourceRef) {
  const props: Array<ObjectConstProp<KIND, T>> = []
  const ret: ObjectConst<KIND, T>
    & {
      add(key: StringConst, val: T): void
    } = {
    kind,
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
    },
    merge
  }
  return ret
  function merge<KIND2 extends SourceNodeObjectKind>(other: ObjectConst<KIND2, T>): ObjectConst<KIND | KIND2, T> {
    const props2: Array<ObjectConstProp<KIND | KIND2, T>> = [
      ...props,
      ...other.props
    ]
    const ret2: ObjectConst<KIND, T> = {
      kind,
      sourceRef,
      props: props2,
      get(key: string | StringConst): T | undefined {
        if (typeof key === 'object') key = key.str
        const f = props2.filter((p) => p.key.str === key)[0]
        return f && f.val
      },
      map(fn) {
        return props2.map((p) => fn(p.val, p.key))
      },
      keys() {
        return props2.map((p) => p.key.str)
      },
      merge
    }
    return ret2
  }

}

export function arrayConst<KIND extends SourceNodeArrayKind, T extends SourceNode<any>>(kind: KIND, sourceRef: SourceRef) {
  const items: Array<T> = []
  const ret: ArrayConst<KIND, T> = {
    kind,
    sourceRef,
    items,
  }
  return ret
}

export interface ComponentRefs<T extends SourceNode<any>> {
  find(path: string): ComponentRef<T> | undefined
  items: Array<ComponentRef<T>>
}

export interface ComponentRef<T extends SourceNode<any>> {
  path: string
  ref: T
}

export type TestingScenarios = ObjectConst<'TestingScenarios', TestingScenario>

export interface TestingScenario extends SourceNode<'TestingScenario'> {
  now: DateConst
  cases: TestingCases
  documents: TestingDocuments
}

export type TestingCases = ObjectConst<'TestingCases', Code>
export type TestingDocuments = ObjectConst<'TestingDocuments', TestingDocument>
export interface TestingDocument extends SourceNode<'TestingDocument'> {
  name: StringConst,
  data: TestingDocumentItems
}

export type TestingDocumentItems = ArrayConst<'TestingDocumentItems', TestingDocumentItem>

export interface TestingDocumentItem extends SourceNode<'TestingDocumentItem'> {
  data: any
}

export type SourceNodeType<KIND extends SourceNodeKind> = KIND extends 'Application' ? Application :
  KIND extends 'Component' ? Component :
  KIND extends 'StringConst' ? StringConst :
  KIND extends 'NumberConst' ? NumberConst :
  KIND extends 'BooleanConst' ? BooleanConst :
  KIND extends 'Workspace' ? Workspace :
  KIND extends 'Application' ? Application :
  KIND extends 'Icon' ? Icon :
  KIND extends 'I18N' ? I18N :
  KIND extends 'ComponentUses' ? ComponentUses :
  KIND extends 'ComponentUse' ? ComponentUse :
  KIND extends 'Component' ? Component :
  KIND extends 'RoleDefs' ? RoleDefs :
  KIND extends 'RoleGroups' ? RoleGroups :
  KIND extends 'RoleDef' ? RoleDef :
  KIND extends 'RoleGroup' ? RoleGroup :
  KIND extends 'BaseType' ? BaseType<any> :
  KIND extends 'NormalType' ? NormalType :
  KIND extends 'EnumType' ? EnumType :
  KIND extends 'EnumOption' ? EnumOption :
  KIND extends 'ComplexType' ? ComplexType :
  KIND extends 'ArrayType' ? ArrayType :
  KIND extends 'UseType1' ? UseType1 :
  KIND extends 'UseTypeAsArray' ? UseTypeAsArray :
  KIND extends 'Fields' ? Fields :
  KIND extends 'Field' ? Field :
  KIND extends 'Document' ? Document :
  KIND extends 'DocAction' ? DocAction :
  KIND extends 'DocField' ? DocField :
  KIND extends 'DocIndex' ? DocIndex :
  KIND extends 'DocumentState' ? DocumentState :
  KIND extends 'UseDocStates' ? UseDocStates :
  KIND extends 'Processes' ? Processes :
  KIND extends 'Process' ? Process :
  KIND extends 'ProcessUse' ? ProcessUse :
  KIND extends 'ProcessVars' ? ProcessVars :
  KIND extends 'AllowLocRoles' ? AllowLocRoles :
  KIND extends 'AllowSysRole' ? AllowSysRole :
  KIND extends 'UseTask' ? UseTask :
  KIND extends 'UseTaskForks' ? UseTaskForks :
  KIND extends 'UITask' ? UITask :
  KIND extends 'UseView' ? UseView :
  KIND extends 'SystemTask' ? SystemTask :
  KIND extends 'UseOperation' ? UseOperation :
  KIND extends 'BindVars' ? BindVars :
  KIND extends 'BindVar' ? BindVar :
  KIND extends 'View' ? View :
  KIND extends 'ViewAction' ? ViewAction :
  KIND extends 'WidgetContent' ? WidgetContent :
  KIND extends 'WidgetEntry' ? WidgetEntry :
  KIND extends 'WidgetMarkdown' ? WidgetMarkdown :
  KIND extends 'OperationLevel' ? OperationLevel :
  KIND extends 'Operation' ? Operation :
  KIND extends 'Code' ? Code :
  KIND extends 'BuilderConfig' ? BuilderConfig :
  KIND extends 'Pagelet' ? Pagelet :
  KIND extends 'RoutePathItem' ? RoutePathItem :
  KIND extends 'RouteCode' ? RouteCode :
  KIND extends 'RouteRedirect' ? RouteRedirect :
  KIND extends 'MenuItem' ? MenuItem :
  KIND extends 'MenuItemSeparator' ? MenuItemSeparator :
  KIND extends 'RoleDef' ? RoleDef :
  KIND extends 'RoleGroup' ? RoleGroup :
  KIND extends 'TestingScenarios' ? TestingScenarios :
  KIND extends 'TestingScenario' ? TestingScenario :
  KIND extends 'TestingCases' ? TestingCases :
  KIND extends 'TestingDocuments' ? TestingDocuments :
  KIND extends 'TestingDocumentItems' ? TestingDocumentItems :
  KIND extends 'TestingDocumentItem' ? TestingDocumentItem :
  unknown
