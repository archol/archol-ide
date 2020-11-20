
import { join } from 'path';
import * as ts from 'ts-morph'
import { deferPromise, DeferredPromise, mapObjectToArray } from '../utils';
import {
  Application, ArrayConst, BooleanConst, NumberConst, objectConst, ObjectConst, Component,
  SourceNode, StringConst, Workspace, sysRoles, isDocument, isProcess, isWidgetContent, EnumType, UseType1,
  Process, Operation, View, Type, Document, RoleDef, Code, I18N, arrayConst, Icon, ComponentUse, ComponentUses,
  Task, UseTask, AllowSysRole, AllowLocRoles, AllowRoles, Fields, Field, UseType, BindVar, ProcessVars,
  UseView, UseOperation, BindVars, OperationLevel, ViewAction, BaseType, NormalType, normalTypes, DocFields, DocIndexes,
  DocumentStates, DocActions, DocAction, DocField, DocIndex, DocumentState, UseDocStates, Routes, Pagelets,
  Pagelet, Menu, MenuItem, MenuItemSeparator, SourceNodeMapped, SourceNodeRefsKind, isComponent, RouteRedirect,
  RouteCode, RoleGroup, TsNode, basicTypes3, ComponentRefs, ComponentRef, isView, EnumOption, ComplexType, ArrayType,
  UseTypeAsArray, Types, SourceNodeKind, SourceNodeObjectKind, SourceNodeArrayKind, BuilderConfig, AppMappings,
  RoleDefs, RoleGroups, WidgetEntry, WidgetMarkdown, WidgetContent, AnyRole, ProcessUse, SourceRef, WidgetItem,
  isCodeNode, isTypeBase, RoutePathItem,
  DocTestingScenarios, DocTestingCol, DocTestingDoc
} from './types'

export async function loadApp(ws: Workspace, appName: string): Promise<Application> {
  const appsource = ws.ts.getSourceFiles().filter(s => s.getBaseName() === appName + '.app.ts')[0]

  if (!appsource) ws.fatal('Aplicação não encontrada: ' + appName + debugFiles(), ws)
  const mappingList: { [id: string]: SourceNodeMapped<any> } = {}
  const mappingPending: Array<Promise<any>> = []
  const appComponentsDef: { [compFullUri: string]: DeferredPromise<Component> } = {}
  const appComponents: { [compFullUri: string]: Component } = {}
  let appsysroles: RoleDefs

  const stmts = appsource.getStatements();
  if (stmts.length != 1) ws.fatal(appsource.getFilePath() + ' só deveria ter uma declaração', appsource)
  const stmt = stmts[0]
  if (stmt instanceof ts.ExpressionStatement) {
    const expr1 = stmt.getExpression()
    if (expr1 instanceof ts.CallExpression) {
      const app = await tsCallExpr<Application>(expr1, 'declareApplication')
      await Promise.all(mappingPending);
      ['start', 'login', 'error'].forEach((na) => {
        const n: 'start' | 'login' | 'error' = na as any
        app[n].ref = (sourceRef) => {
          const [rcompalias, rprocn] = app[n].str.split('/')
          const rcomp = app.uses.get(rcompalias)
          if (!rcomp)
            throw ws.fatal('component do app.' + n + ' não definido', app[n])
          const rcompRef = rcomp.ref(app[n])
          const rproc = rcompRef.processes.get(rprocn)
          if (!rproc)
            throw ws.fatal('processo do app ' + n + ' não definido', app[n])
          return rproc
        }
        if (app[n].ref(app[n]).vars.input.props.length)
          throw ws.fatal('processo do app.' + n + ' não deve ter INPUT', app[n])
      })
      return app
    }
  }
  throw ws.fatal(appsource.getFilePath() + ' comando deveria ser declareApplication ou declareComponent', appsource)

  function debugFiles() {
    return ' debugfiles=' + ws.ts.getSourceFiles().map(s => s.getFilePath().substr(ws.path.length + 4)).join()
  }

  async function tsCallExpr<T>(expr1: ts.CallExpression, valid: string): Promise<T> {
    const fnexpr = expr1.getExpression()
    if (fnexpr instanceof ts.Identifier) {
      const fn = fnexpr.getText()
      if (fn !== valid) ws.fatal('Esperado ' + valid, fnexpr)
      return runFunc<T>(fn, expr1)
    }
    else if (fnexpr instanceof ts.PropertyAccessExpression) {
      const objExpr = fnexpr.getExpression()
      if (objExpr instanceof ts.CallExpression) {
        const obj = await tsCallExpr<any>(objExpr, valid)
        const n = fnexpr.getName()
        const propfn = obj[n]
        if (typeof propfn !== 'function') ws.fatal('tsCallExpr.propfn ' + objExpr.getKindName() + '->' + n, objExpr)
        return await Promise.resolve(propfn(expr1) as T)
      }
    }
    throw ws.fatal('tsCallExpr', expr1)
  }

  async function runFunc<T>(fn: string, expr1: ts.CallExpression): Promise<T> {
    const args = expr1.getArguments()
    if (fn === 'declareApplication') {
      if (args.length !== 2) ws.error(expr1.getSourceFile().getFilePath() + ' declareApplication precisa de dois parametros', expr1)
      const appname = parseStrArg(args[0])
      return declareApplication(appname, args[1]) as any
    } else if (fn === 'declareComponent') {
      if (args.length !== 2) ws.error(expr1.getSourceFile().getFilePath() + ' declareComponent precisa de dois parametros', expr1)
      const compns = parseStrArg(args[0])
      const comppath = parseStrArg(args[1])
      return declareComponent(compns, comppath) as any
    }
    throw ws.fatal(expr1.getSourceFile().getFilePath() + ' declareApplication ou declareComponent era esperado', expr1)
  }

  function isStrArg(arg: ts.Node) {
    return (arg instanceof ts.StringLiteral) ||
      (arg instanceof ts.NoSubstitutionTemplateLiteral) ||
      (arg instanceof ts.TaggedTemplateExpression)
  }

  function isObjArg(arg: ts.Node) {
    return (arg instanceof ts.ObjectLiteralExpression)
  }

  function getObjArgPropVal(arg: ts.Node, prop: string): string | undefined {
    if (arg instanceof ts.ObjectLiteralExpression) {
      const p = arg.getProperty(prop)
      const i = p instanceof ts.PropertyAssignment && p.getInitializer()
      if (i) return i.getText()
    }
  }

  function isArrArg(arg: ts.Node): arg is ts.ArrayLiteralExpression {
    return (arg instanceof ts.ArrayLiteralExpression)
  }

  function parseStrArg<T extends string = string>(arg: ts.Node): StringConst<T> {
    let ret: StringConst<T> = undefined as any
    if (arg instanceof ts.StringLiteral) ret = {
      kind: 'StringConst',
      sourceRef: ws.getRef(arg),
      str: arg.getLiteralValue() as T
    }
    else if (arg instanceof ts.NoSubstitutionTemplateLiteral) ret = {
      kind: 'StringConst',
      sourceRef: ws.getRef(arg),
      str: arg.getLiteralValue() as T
    }
    else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' string é esperada', arg)
    return ret
  }

  function parserForStrArg<T extends string>() {
    return (arg: ts.Node) => parseStrArg<T>(arg)
  }

  function parseNumArg(arg: ts.Node): NumberConst {
    let ret: NumberConst = undefined as any
    if (arg instanceof ts.NumericLiteral) ret = {
      kind: 'NumberConst',
      sourceRef: ws.getRef(arg),
      num: arg.getLiteralValue()
    }
    else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' number é esperada', arg)
    return ret
  }

  function parseBolArg(arg: ts.Node): BooleanConst {
    let ret: BooleanConst = undefined as any
    if (arg instanceof ts.BooleanLiteral) ret = {
      kind: 'BooleanConst',
      sourceRef: ws.getRef(arg),
      bool: arg.getLiteralValue()
    }
    else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' boolean é esperada', arg)
    return ret
  }

  function isCodeArg(argCode: ts.Node) {
    return (argCode instanceof ts.MethodDeclaration)
      || (argCode instanceof ts.FunctionDeclaration) ||
      (argCode instanceof ts.FunctionExpression)
  }

  function parserForCode(validate?: (params: ts.ParameterDeclaration[], retType: ts.Type) => boolean) {
    return (argCode: ts.Node): Code => {
      let ret: Code = null as any
      if (argCode instanceof ts.MethodDeclaration) {
        rcode(
          argCode,
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements(),
          argCode.isAsync()
        )
      }
      else if (argCode instanceof ts.FunctionDeclaration) {
        rcode(
          argCode,
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements(),
          argCode.isAsync())
      }
      else if (argCode instanceof ts.FunctionExpression) {
        rcode(
          argCode,
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements(),
          argCode.isAsync())
      }
      else if (argCode instanceof ts.ArrowFunction) {
        rcode(
          argCode,
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements(),
          argCode.isAsync())
      }
      else ws.error(argCode.getSourceFile().getFilePath() + ' ' + argCode.getText() + ' boolean é esperada', argCode)
      return ret

      function rcode(
        fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.MethodDeclaration | ts.FunctionExpression,
        typedParams: ts.TypeParameterDeclaration[],
        params: ts.ParameterDeclaration[],
        retType: ts.Type,
        body: ts.Statement[],
        async: boolean
      ): void {
        if (typedParams?.length) ws.error('não suporta typedparams ', argCode)
        if (validate) ws.fatal('TODO', argCode)
        ret = {
          kind: 'Code',
          sourceRef: ws.getRef(argCode),
          params,
          ret: retType,
          body,
          fn,
          async
        }
      }
    }
  }

  function getMapped<KIND extends SourceNodeKind, T extends SourceNodeMapped<KIND>>(
    sourceRef: TsNode, id: string, kind: KIND, def: () => T): T {
    let r: any = mappingList[id]
    if (!r) ws.error('nao existe ' + id, sourceRef)
    else if (r.kind !== kind) ws.error(' esperado ' + kind + ' em' + id, sourceRef)
    if (!r) {
      r = def()
      if (!r.kind) r.kind = kind
      if (!r.sourceRef) r.kind = ws.getRef(sourceRef)
    }
    return r
  }

  function nodeMapping(names: string[], register: () => SourceNodeMapped<any>) {
    const id = names.join('.')
    mappingPending.push(new Promise((resolve) => {
      setTimeout(() => {
        mappingList[id] = register()
        resolve()
      }, 1)
    }))
    return {
      id
    }
  }

  function parsePropertyName(nameNode: any) {
    let ret: StringConst = undefined as any
    if (nameNode instanceof ts.StringLiteral) ret = {
      kind: 'StringConst',
      sourceRef: ws.getRef(nameNode),
      str: nameNode.getLiteralValue()
    }
    else if (nameNode instanceof ts.Identifier) ret = {
      kind: 'StringConst',
      sourceRef: ws.getRef(nameNode),
      str: nameNode.getText()
    }
    else ws.error(nameNode.getText() + ': nome de propriedade não tratado', nameNode)
    return ret
  }

  type ParsedObjProps<T extends {
    [name: string]: (val: ts.Node, name: StringConst) => SourceNode<any>
  }> = {
      [K in keyof T]: ReturnType<T[K]>
    }

  function parseObjArg<
    PROPS extends {
      [name: string]: (val: ts.Node, name: StringConst) => SourceNode<any>
    }
  >(
    arg: ts.Node,
    props: PROPS,
    optionalProps: Array<keyof PROPS>
  ): ParsedObjProps<PROPS> {
    return parseObjArgAny(arg, props, optionalProps)
  }

  type ParsedObjPropsAny<T extends {
    [name: string]: (val: ts.Node, name: StringConst) => any
  }> = {
      [K in keyof T]: ReturnType<T[K]>
    }

  function parseObjArgAny<
    PROPS extends {
      [name: string]: (val: ts.Node, name: StringConst) => any
    }
  >(
    argObj: ts.Node,
    props: PROPS,
    optionalProps: Array<keyof PROPS>
  ): ParsedObjPropsAny<PROPS> {
    let ret: ParsedObjPropsAny<PROPS> = {} as any
    if (argObj instanceof ts.ObjectLiteralExpression) {
      for (const p of argObj.getProperties()) {
        if (p instanceof ts.PropertyAssignment) {
          const propNode = p.getNameNode()
          const propName = parsePropertyName(propNode)
          const propValue: any = p.getInitializer();
          invokeProp(propNode, propName, propValue)
        }
        else if (p instanceof ts.MethodDeclaration) {
          const propNode = p.getNameNode()
          const propName = parsePropertyName(propNode)
          invokeProp(propNode, propName, p)
        } else ws.fatal(p.getText() + ': tipo de propriedade não tratado', p)
        // ts.PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | ts.MethodDeclaration | AccessorDeclaration;

        //ts.NoSubstitutionTemplateLiteral | TemplateExpression | ts.BooleanLiteral |  ts.StringLiteral | ts.NumericLiteral | ObjectLiteralElementLike
        //arg.getLiteralValue()
      }
    } else ws.fatal(argObj.getSourceFile().getFilePath() + ' ' + argObj.getText() + ' objeto é esperado', argObj)
    Object.keys(props).forEach((name) => {
      if (!(ret as any)[name]) {
        if (optionalProps.indexOf(name) === -1)
          ws.error(argObj.getSourceFile().getFilePath() + ' ' + argObj.getText() + ' falta propriedade ' + name + ' em ' + argObj.getText(), argObj)
      }
    })
    return ret
    function invokeProp(propNode: ts.PropertyName, propName: StringConst, propValue: ts.Node) {
      let fn = (props as any)[propName.str]
      fn = (props as any)[fn ? propName.str : '*']
      if (!fn) ws.fatal('Não é possível interpretar a propriedade: ' + propName.str, propNode);
      try {
        const fnres = fn(propValue, propName);
        if (fnres !== undefined) (ret as any)[propName.str] = fnres
      } catch (e) {
        ws.fatal('Erro interpretar a propriedade: ' + propName.str + ' ' + e.message, propNode);
        console.log('Erro interpretar a propriedade: ' + propName.str + ' ' + e.message, argObj.getText(), fn, e)
      }
    }
  }

  function parseColObjArg<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(
    kind: KIND,
    arg: ts.Node,
    fn: (itm: ts.Node, name: StringConst) => T,
    filter?: (itm: ts.Node, name: StringConst) => boolean)
    : ObjectConst<KIND, T> {
    const col = objectConst<KIND, T>(kind, ws.getRef(arg))
    parseObjArg(arg, {
      '*'(val, name) {
        const filtered = (!filter) || filter(val, name)
        if (filtered) {
          const t: T = fn(val, name)
          col.add(name, t)
          return t
        }
        return undefined as any
      }
    }, ['*'])
    return col
  }

  function parserForArrArg<KIND extends SourceNodeArrayKind, T extends SourceNode<any>>(
    kind: KIND,
    fn: (itm: ts.Node) => T)
    : (arg: ts.Node) => ArrayConst<KIND, T> {
    return (arg: ts.Node) => {
      let ret: ArrayConst<KIND, T> = undefined as any
      if (arg instanceof ts.ArrayLiteralExpression) {
        ret = arrayConst(kind, ws.getRef(arg))
        ret.items = arg.getElements().map(fn)
      } else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' Array é esperado', arg)
      return ret
    }
  }

  function parseTitle(titArg: ts.Node) {
    if (isCodeArg(titArg)) return parserForCode()(titArg)
    return parseI18N(titArg)
  }

  function parseI18N(arg: ts.Node): I18N {
    // todo PARAMS
    const ret: I18N = {
      kind: "I18N",
      sourceRef: ws.getRef(arg),
      msg: objectConst<'I18NMsg', StringConst>('I18NMsg', ws.getRef(arg))
    }
    if (arg instanceof ts.ObjectLiteralExpression) {
      parseObjArg(arg, {
        '*'(msgNode, lang) {
          const msg = parseStrArg(msgNode)
          ret.msg.props.push({
            key: lang,
            val: msg
          })
          return msg
        }
      }, ['*'])
    }
    else if (arg instanceof ts.StringLiteral) ret.msg.props.push({
      key: ws.defaultLang,
      val: parseStrArg(arg)
    })
    else if (arg instanceof ts.NoSubstitutionTemplateLiteral) ret.msg.props.push({
      key: ws.defaultLang,
      val: parseStrArg(arg)
    })
    else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' I18N é esperada', arg)
    return ret
  }

  function parseIcon(arg: ts.Node): Icon {
    const str = parseStrArg(arg)
    return {
      kind: 'Icon',
      sourceRef: str.sourceRef,
      icon: str.str
    }
  }

  async function declareApplication(name: StringConst, opts: ts.Node): Promise<Application> {
    const appprops: Omit<Omit<Omit<Omit<Omit<Omit<Omit<Application, 'kind'>, 'sourceRef'>, 'name'>, 'getMapped'>, 'allComponents'>, 'mappingList'>, 'allroles'>
      = parseObjArg(opts, {
        description: parseI18N,
        icon: parseIcon,
        start: parseProcessUse,
        login: parseProcessUse,
        error: parseProcessUse,
        uses: parseComponentUses,
        langs: parserForArrArg('AppLanguages', parseStrArg),
        builders: parseAppBuilders,
        mappings: parseAppMappings,
        pagelets: parsePagelets,
        routes: parseRoutes,
        menu: parseMenu(() => appprops.uses),
        sysroles(val) {
          return parseRoleDefs(name)(val, true)
        }
      }, [])
    appsysroles = appprops.sysroles
    appprops.uses = await componentUsesWaitter(appprops.uses)
    const app: Application = {
      ...appprops,
      kind: 'Application',
      sourceRef: ws.getRef(name),
      name,
      allComponents: mapObjectToArray(appComponents, (p) => p),
      mappingList,
      getMapped(uri: StringConst) {
        const id = app.mappings.get(uri)
        if (id) return id
        ws.error(uri + ' não mapeado', uri)
        return {
          kind: 'StringConst',
          sourceRef: uri.sourceRef,
          str: 'UNMAPPED_ID(\'' + uri + '\')'
        }
      },
    }
    return app

    // function parseBuilderConfigs(arg: ts.Node) {
    //   let ret = objectConst<BuilderConfig>(ws.getRef(arg))
    //   parseObjArg(arg, {
    //     '*'(val, name) {
    //       const uri = parseStrArg(val)
    //       ret.add(name, val)
    //       return compuse
    //     }
    //   })
    //   return ret
    // }
    // function parseAppMappings(): any {
    //   x
    // }
  }

  function parseAppBuilders(argBuilders: ts.Node): ObjectConst<'AppBuilders', BuilderConfig> {
    return objectConst<'AppBuilders', BuilderConfig>('AppBuilders', ws.getRef(argBuilders))
  }

  function parseAppMappings(argBuilders: ts.Node): AppMappings {
    return objectConst<'AppMappings', StringConst>('AppMappings', ws.getRef(argBuilders))
  }

  function parseComponentUses(argCompUses: ts.Node): ComponentUses {
    return parseColObjArg('ComponentUses', argCompUses, (argUri, alias) => {
      const uri = parseStrArg(argUri)
      loadComp(uri)
      const compuse: ComponentUse = {
        kind: 'ComponentUse',
        sourceRef: ws.getRef(argUri),
        alias,
        uri,
        ref(sourceRef) {
          const p = appComponents[uri.str]
          if (!p) throw ws.fatal('comp not found ' + uri.str, sourceRef)
          return p
        },
        get promise() {
          return appComponentsDef[uri.str].promise
        }
      }
      return compuse
    })
  }

  function parseProcessUse(argProcUse: ts.Node): ProcessUse {
    const procuri = parseStrArg<'ProcessUse'>(argProcUse)
    const ret: ProcessUse = {
      ...procuri,
      ref(sourceRef) {
        const [compn, procn] = procuri.str.split('/')
        const comp = appComponents[compn]
        if (!comp) throw ws.fatal('comp not found ' + compn, sourceRef)
        const proc = comp.processes.get(procn)
        if (!proc) throw ws.fatal('proc not found ' + procuri.str, sourceRef)
        return proc
      }
    }
    return ret
  }

  async function componentUsesWaitter(componentUses: ComponentUses): Promise<ComponentUses> {
    if (componentUses.props.length)
      await Promise.all(componentUses.props.map((i) => i.val.promise))
    return componentUses
  }

  function parseRoutes(argRoutes: ts.Node): Routes {
    return parseColObjArg('Routes', argRoutes, (itmRoute, itmPath) => {
      const isRedirect = isStrArg(itmRoute)
      const pathsplit = itmPath.str === '/' ? [''] : itmPath.str.split('/')
      if (pathsplit[0] !== '') ws.error('Rota inválida: ' + itmPath.str, itmPath)
      const itmPathArr = arrayConst<'RoutePath', RoutePathItem>('RoutePath', ws.getRef(itmPath))
      const params: RoutePathItem[] = []
      itmPathArr.items = pathsplit.slice(1).map((p, i) => {
        const isword = /^\w+$/g.test(p)
        const isparam = /^\{\w+\}$/g.test(p) && (!isRedirect)
        const isrest = p === '...' && i === pathsplit.length - 2
        const ok = isword || isparam || isrest
        if (!ok) ws.error('Rota inválida: ' + itmPath.str, itmPath)
        const r: RoutePathItem = {
          ...itmPath,
          str: p,
        }
        if (isparam) {
          r.str = '=' + r.str.replace('{', '').replace('}', '')
          r.type = true as any
          params.push(r)
        }
        return r
      })
      if (isRedirect) {
        const redirect = parseStrArg(itmRoute)
        const rr: RouteRedirect = {
          kind: 'RouteRedirect',
          sourceRef: redirect.sourceRef,
          path: itmPathArr,
          redirect
        }
        return rr
      } else {
        const code = parserForCode()(itmRoute)
        if (code.params.length - 1 === params.length) {
          code.params.slice(1).forEach((p1, i) => {
            const p2 = params[i]
            if (('=' + p1.getName()) !== p2.str) ws.error('rota ' + itmPath.str + ' incompatível idx=' + i + ' ' + p1.getName() + '!==' + p2.str, itmRoute)
            p2.type = p1.getType().getText()
          })
        } else ws.error('rota ' + itmPath.str + 'qtde de params invalido', itmRoute)
        const rc: RouteCode = {
          kind: 'RouteCode',
          sourceRef: code.sourceRef,
          path: itmPathArr,
          code
        }
        return rc
      }
    })
  }

  function parsePagelets(argPagelets: ts.Node): Pagelets {
    return parseColObjArg('Pagelets', argPagelets, (itmPagelet, pageletName) => {
      const pprops = parseObjArg(itmPagelet, {
        left: parseNumArg,
        top: parseNumArg,
        right: parseNumArg,
        bottom: parseNumArg,
        drawer: parseBolArg,
        content: parseBolArg
      }, ['left', 'top', 'right', 'bottom', 'drawer', 'content'])
      const pagelet: Pagelet = {
        kind: 'Pagelet',
        sourceRef: ws.getRef(itmPagelet),
        name: pageletName,
        ...pprops
      }
      return pagelet
    })
  }

  function parseMenu(appuses: () => ComponentUses) {
    return (argMenu: ts.Node): Menu => {
      return parserForArrArg('Menu', (itmMenu) => {
        if (isStrArg(itmMenu)) {
          const str = parseStrArg(itmMenu)
          if (str.str !== '-') ws.error('menu invalido', itmMenu)
          const sep: MenuItemSeparator = {
            kind: 'MenuItemSeparator',
            sourceRef: ws.getRef(itmMenu)
          }
          return sep
        }
        const pprops = parseObjArg(itmMenu, {
          caption: parseI18N,
          icon: parseIcon,
          allow: parseAllowRolesApp(appuses),
          run(val): StringConst | Code {
            if (isStrArg(val)) return parseStrArg(val)
            return parserForCode()(val)
          }
        }, [])
        const menuItem: MenuItem = {
          kind: 'MenuItem',
          sourceRef: ws.getRef(itmMenu),
          ...pprops
        }
        return menuItem
      })(argMenu)
    }
  }

  function parseRoleDefs(parent: StringConst) {
    return (argRoles: ts.Node, sys: boolean): RoleDefs => {
      const roleDefs = parseColObjArg('RoleDefs', argRoles, (itm, name) => {
        const rprops = parseObjArg(itm, {
          description: parseI18N,
          icon: parseIcon,
        }, [])
        const role: RoleDef = {
          kind: 'RoleDef',
          sourceRef: ws.getRef(itm),
          nodeMapping: nodeMapping([parent.str, 'role', name.str], () => role),
          name,
          defComp: null as any,
          ...rprops
        }
        return role;
      }, (itm) => isObjArg(itm))
      sysRoles.forEach((dr) => {
        const erdef = roleDefs.get(dr)
        if (erdef && (!sys)) ws.error('Role ' + dr + ' yet exists', erdef)
        if ((!erdef) && sys) ws.error('Role ' + dr + ' não é de sistema', roleDefs)
      })
      return roleDefs
    }
  }

  function parseAllowRolesApp(appuses: () => ComponentUses) {
    return (argAllowRoles: ts.Node): AllowRoles => {
      if (argAllowRoles instanceof ts.ArrayLiteralExpression) {
        const el = argAllowRoles.getElements()
        if (el.length === 0) ws.error('need role', argAllowRoles)
        if (el.length === 1) return r1(el[0])
        const allow = parserForArrArg('AllowLocRoleList', parseStrArg)(argAllowRoles)
        allow.items.some((r) => {
          if (sysRoles.includes(r.str)) ws.error('Role de sistema não pode ser combinado com outros', r)
        })
        const ret: AllowLocRoles = {
          kind: 'AllowLocRoles',
          sourceRef: ws.getRef(argAllowRoles),
          allow,
          ref() {
            return allow.items.map((r) => {
              const [compname, rolename] = r.str.split('/')
              const p = appuses().get(compname)?.ref(r)
              if (p) {
                const l1 = p.roleDefs.get(rolename)
                if (l1) return { comp: p, role: l1 as AnyRole }
                const l2 = p.roleGroups.get(rolename)
                if (l2) return { comp: p, role: l2 as AnyRole }
              }
              throw ws.error('Role não encontrado: ' + r.str, r)
            }) as any
          }
        }
        return ret
      }
      return r1(argAllowRoles)
      function r1(arg1: ts.Node): any {
        const str = parseStrArg(arg1)
        if (sysRoles.includes(str.str)) {
          const rs: AllowSysRole = {
            kind: 'AllowSysRole',
            sourceRef: str.sourceRef,
            role: str,
            ref() {
              const l = appsysroles.get(str)
              if (!l) throw ws.error('Role não encontrado: ' + str.str, str)
              return l
            }
          }
          return rs
        }
        const ret: AllowLocRoles = {
          kind: 'AllowLocRoles',
          sourceRef: str.sourceRef,
          allow: {
            kind: 'AllowLocRoleList',
            sourceRef: str.sourceRef,
            items: [
              str
            ]
          },
          ref() {
            // const l = comp.roleDefs.get(str)
            // if (l) return [l]
            // const l2 = comp.roleGroups.get(str)
            // if (l2) return [l2]
            throw ws.error('Role não encontrado: ' + str.str, str)
          }
        }
        return ret
      }
    }
  }

  async function loadComp(compuri: StringConst): Promise<void> {

    let compdecl = appComponentsDef[compuri.str]
    if (compdecl) return

    appComponentsDef[compuri.str] = deferPromise()
    try {

      const expectedFile = ws.path + '/ws/' + compuri.str + '.comp.ts'
      const compsource = ws.ts.getSourceFiles().filter(s => s.getFilePath() === expectedFile)[0]

      if (!compsource) {
        ws.error('Pacote não encontrado: ' + compuri.str + debugFiles(), compuri)
        appComponents[compuri.str] = invalidComponent(compuri)
        appComponentsDef[compuri.str].resolve(appComponents[compuri.str])
        return
      }

      const stmts = compsource.getStatements();
      if (stmts.length != 1) ws.fatal(compsource.getFilePath() + ' só deveria ter uma declaração', compsource)
      const stmt = stmts[0]
      if (stmt instanceof ts.ExpressionStatement) {
        const expr1 = stmt.getExpression()
        if (expr1 instanceof ts.CallExpression) {
          const p = await tsCallExpr<Component>(expr1, 'declareComponent')
          createCompRefs(p)
          appComponentsDef[compuri.str].resolve(p)
          return
        }
      }
      throw ws.fatal(compsource.getFilePath() + ' comando deveria ser declareApplication ou declareComponent', compsource)
    } catch (e) {
      appComponentsDef[compuri.str].reject(e)
      console.log(e)
      throw e
    }
  }

  async function declareComponent(compns: StringConst, comppath: StringConst) {
    const compfull: StringConst = {
      kind: 'StringConst',
      sourceRef: {
        ...compns.sourceRef,
        end: comppath.sourceRef.end
      },
      str: join(compns.str, comppath.str)
    }
    if (!appComponentsDef[compfull.str]) throw ws.fatal('component não definido' + compfull.str, compfull)

    const compid: StringConst = {
      kind: 'StringConst',
      sourceRef: compfull.sourceRef,
      str: compfull.str.replace(/[\/\.]/g, '_').replace(/[^\w.]/g, '')
    }
    const compuri = {
      id: compid,
      full: compfull,
      ns: compns,
      path: comppath
    }
    const comp: Component = {
      kind: 'Component',
      sourceRef: ws.getRef(compfull),
      uri: compuri,
    } as any
    appComponents[compfull.str] = comp

    return { uses }

    function componentGetRef<KIND extends SourceNodeKind, T extends SourceNodeMapped<KIND>>(opts: {
      refId: StringConst,
      kind: KIND,
      where: keyof Component,
      isInternal: (str: string) => T | false
      invalid: (ws: Workspace, str: string, ref: SourceRef) => Omit<Omit<T, 'sourceRef'>, 'kind'>
    }): (sourceRefGet: TsNode) => T {
      return (sourceRefGet: TsNode | null) => {
        const internal = opts.isInternal(opts.refId.str)
        if (internal) return internal as any

        let tn = opts.refId.str
        if (tn.includes('/')) {
          const parts = tn.split('/')
          if (parts.length === 2) {
            const t = tryComp(parts[0], parts[1])
            if (t) return t
          }
        } else tn = compid.str + '.type.' + tn

        const inv: T = {
          ...opts.invalid(ws, tn, ws.getRef(opts.refId)),
          kind: opts.kind as any,
          sourceRef: sourceRefGet
        } as any
        return inv
        function tryComp(compalias: string, typename: string): T | undefined {
          let p: Component | undefined = comp
          if (compalias !== '.') {
            const pa = comp.uses.get(compalias)
            p = pa && pa.ref(opts.refId)
          }
          if (!p) return
          const pp = (p as any)[opts.where]
          if (pp) return pp.get(typename)
        }
        //   return getMapped(sourceRef, tn, 'Type', def)
        //   function def(base?: string): Type {
        //     return {
        //       kind: 'Type',
        //       name: str,
        //       nodeMapping: {
        //         id: tn
        //       },
        //       sourceRef: ws.getRef(sourceRef),
        //       base: (base || ('invalid_type_' + tn)) as any
        //     }
        //   }
        // }
        // sourceRef: TsNode, id: string, kind: KIND, def: () => T): T {
        //   let r: any = mappingList[id]
        //   if (!r) ws.error('nao existe ' + id, sourceRef)
        //   else if (r.kind !== kind) ws.error(' esperado ' + kind + ' em' + id, sourceRef)
        //   if (!r) {
        //     r = def()
        //     if (!r.kind) r.kind = kind
        //     if (!r.sourceRef) r.kind = ws.getRef(sourceRef)
        //   }
        //   return r
        // }

      }
    }

    function parseRolesGroup(parent: StringConst) {
      return (argRoles: ts.Node, sys: boolean): RoleGroups => {
        const roleGroups = parseColObjArg('RoleGroups', argRoles, (itm, name) => {

          const roles = parseAllowRoles(itm)
          const role: RoleGroup = {
            kind: 'RoleGroup',
            sourceRef: ws.getRef(itm),
            nodeMapping: nodeMapping([parent.str, 'role', name.str], () => role),
            name,
            allow: roles,
            defComp: null as any
          }
          return role;
        }, (itm) => !isObjArg(itm))

        sysRoles.forEach((dr) => {
          const ergroup = roleGroups.get(dr)
          if (ergroup && (!sys)) ws.error('Role ' + dr + ' yet exists', ergroup)
          if ((!ergroup) && sys) ws.error('Role ' + dr + ' não é de sistema', roleGroups)
        })
        return roleGroups
      }
    }

    function parseAllowRoles(argAllowRoles: ts.Node): AllowRoles {
      if (argAllowRoles instanceof ts.ArrayLiteralExpression) {
        const el = argAllowRoles.getElements()
        if (el.length === 0) ws.error('need role', argAllowRoles)
        if (el.length === 1) return r1(el[0])
        const allow = parserForArrArg('AllowLocRoleList', parseStrArg)(argAllowRoles)
        allow.items.some((r) => {
          if (sysRoles.includes(r.str)) ws.error('Role de sistema não pode ser combinado com outros', r)
        })
        const ret: AllowLocRoles = {
          kind: 'AllowLocRoles',
          sourceRef: ws.getRef(argAllowRoles),
          allow,
          ref() {
            return allow.items.map((r) => {
              const l = comp.refs.roleDefs.find(r.str)
              if (l) return { comp, role: l.ref }
              const l2 = comp.refs.roleGroups.find(r.str)
              if (l2) return { comp, role: l2.ref }
              throw ws.error('Role não encontrado: ' + r.str, r)
            })
          }
        }
        return ret
      }
      return r1(argAllowRoles)
      function r1(arg1: ts.Node): any {
        const str = parseStrArg(arg1)
        if (sysRoles.includes(str.str)) {
          const rs: AllowSysRole = {
            kind: 'AllowSysRole',
            sourceRef: str.sourceRef,
            role: str,
            ref() {
              const l = appsysroles.get(str)
              if (!l) throw ws.error('Role não encontrado: ' + str.str, str)
              return l
            }
          }
          return rs
        }
        const ret: AllowLocRoles = {
          kind: 'AllowLocRoles',
          sourceRef: str.sourceRef,
          allow: {
            kind: 'AllowLocRoleList',
            sourceRef: str.sourceRef,
            items: [
              str
            ]
          },
          ref() {
            const l = comp.roleDefs.get(str)
            if (l) return [{ comp, role: l }]
            const l2 = comp.roleGroups.get(str)
            if (l2) return [{ comp, role: l2 }]
            throw ws.error('Role não encontrado: ' + str.str, str)
          }
        }
        return ret
      }
    }
    function parseUseType(argUseType: ts.Node): UseType {
      const strTypeName = parseStrArg(argUseType)
      return mountUseType(strTypeName)
    }
    function mountUseType(strTypeName: StringConst) {
      if (strTypeName.str.endsWith('[]')) {
        const itemTypeName: StringConst = {
          kind: 'StringConst',
          sourceRef: strTypeName.sourceRef,
          str: strTypeName.str.substring(0, strTypeName.str.length - 2)
        }
        const itemType = mountUseType(itemTypeName)
        const retTypeArr: UseTypeAsArray = {
          kind: 'UseTypeAsArray',
          sourceRef: itemType.sourceRef,
          itemType,
          base(sourceRef: TsNode | null): string {
            return retTypeArr.itemType.base(sourceRef) + '[]'
          },
          ref: componentGetRef({
            kind: 'NormalType',
            refId: strTypeName,
            where: 'types',
            isInternal: (s) => (basicTypes3 as any)[s],
            invalid: makeInvalid
          })
        }
        return retTypeArr
      } else {
        const retType1: UseType1 = {
          kind: 'UseType1',
          sourceRef: strTypeName.sourceRef,
          type: strTypeName,
          base(sourceRef: TsNode | null): string {
            const typeRef = retType1.ref(sourceRef)
            try {
              return typeRef.base().base
            } catch (e) {
              console.log('UseType1 error: ', typeRef)
              console.log(e)
              throw e
            }
          },
          ref: componentGetRef({
            kind: 'NormalType',
            refId: strTypeName,
            where: 'types',
            isInternal: (s) => (basicTypes3 as any)[s],
            invalid: makeInvalid
          })
        }
        return retType1
      }
    }
    function parseFields(argf: ts.Node): Fields {
      return parseColObjArg('Fields', argf, (itm, name) => {
        const fprops = parseObjArg(itm, {
          description: parseI18N,
          type: parseUseType,
        }, ['description'])
        const field: Field = {
          kind: 'Field',
          sourceRef: ws.getRef(itm),
          name,
          ...fprops
        }
        return field
      })
    }
    async function uses(expr1Uses: ts.CallExpression) {
      const argsUses = expr1Uses.getArguments()
      if (argsUses.length !== 1) ws.error(expr1Uses.getSourceFile().getFilePath() + ' uses precisa de um parametro', expr1Uses)
      comp.uses = await componentUsesWaitter(parseComponentUses(argsUses[0]))
      return { roles }
    }
    function roles(expr1Roles: ts.CallExpression) {
      const args = expr1Roles.getArguments()
      if (args.length !== 1) ws.error(expr1Roles.getSourceFile().getFilePath() + ' roles precisa de um parametro', expr1Roles)
      comp.roleDefs = parseRoleDefs(compid)(args[0], false)
      comp.roleGroups = parseRolesGroup(compid)(args[0], false)
      return { processes }
    }
    function processes(expr1Process: ts.CallExpression) {
      const argsProc = expr1Process.getArguments()
      if (argsProc.length !== 1) ws.error(expr1Process.getSourceFile().getFilePath() + ' processes precisa de um parametro', expr1Process)
      comp.processes = objectConst('Processes', ws.getRef(argsProc[0]))
      parseObjArg(argsProc[0], {
        '*'(val, processName) {
          const pprops = parseObjArg(val, {
            title: parseTitle,
            caption: parseI18N,
            icon: parseIcon,
            start: parseUseTask,
            tasks: parseTasks,
            vars: parseVars,
            allow: parseAllowRoles,
            volatile: parseBolArg,
            singleton: parseBolArg,
          }, ['singleton', 'volatile'])
          if (!pprops.volatile) pprops.volatile = {
            kind: 'BooleanConst',
            sourceRef: ws.getRef(processName),
            bool: false,
          }
          if (!pprops.singleton) pprops.singleton = {
            kind: 'BooleanConst',
            sourceRef: ws.getRef(processName),
            bool: false
          }
          const process: Process = {
            kind: 'Process',
            sourceRef: ws.getRef(processName),
            name: processName,
            refs: null as any,
            nodeMapping: nodeMapping([compid.str, 'process', processName.str], () => process),
            ...pprops,
            defComp: null as any
          }
          comp.processes.props.push({
            key: processName, val: process
          })
          return process

          function parseVars(argVars: ts.Node) {
            const pvars = parseObjArg(argVars, {
              input: parseFields,
              output: parseFields,
              local: parseFields,
            }, [])
            const vars: ProcessVars = {
              kind: 'ProcessVars',
              sourceRef: ws.getRef(argVars),
              ...pvars,
              get(fullname: string | StringConst) {
                throw new Error('todo get field ' + fullname)
              }
            }
            return vars
          }
          function parseBindVars(argBindVars: ts.Node): BindVars {
            return parseColObjArg('BindVars', argBindVars, (itmBindVar) => {
              const str = parseStrArg(itmBindVar)
              const b: BindVar = {
                kind: 'BindVar',
                sourceRef: str.sourceRef,
                fieldpath: str,
                ref(): Field {
                  return process.vars.get(str)
                }
              }
              return b
            })
          }
          function parseTasks(argTasks: ts.Node) {
            return parseColObjArg('Tasks', argTasks, (val, taskname) => {
              const tprops = parseObjArg(val, {
                pool: parseStrArg,
                lane: parseStrArg,
                allow: parseAllowRoles,
                next: parseNextTask,
                useView: parseUseView,
                useOperation: parseUseOperation
              }, ['useView', 'useOperation', 'allow', 'pool', 'lane'])
              const task: Task = {
                kind: tprops.useOperation ? 'SystemTask' : 'UITask',
                sourceRef: ws.getRef(val),
                name: taskname,
                ...tprops
              } as any
              return task
            })
          }
          function mountUseTask(taskname: StringConst) {
            const ret: UseTask = {
              kind: 'UseTask',
              sourceRef: taskname.sourceRef,
              task: taskname,
              ref() {
                const r = process.tasks.get(taskname)
                if (!r) throw ws.error('Tarefa não encontrada: ' + taskname, taskname)
                return r
              }
            }
            return ret
          }
          function parseUseTask(argUseTask: ts.Node): UseTask {
            const taskname = parseStrArg(argUseTask)
            return mountUseTask(taskname)
          }
          function parseNextTask(argNextTask: ts.Node): ArrayConst<'UseTaskForks', UseTask> {
            if (argNextTask instanceof ts.ArrayLiteralExpression) {
              return parserForArrArg('UseTaskForks', parseUseTask)(argNextTask)
            }
            const ret = arrayConst<'UseTaskForks', UseTask>("UseTaskForks", ws.getRef(argNextTask))
            if (argNextTask instanceof ts.ObjectLiteralExpression) {
              parseObjArg(argNextTask, {
                '*'(val, name) {
                  const useTask = mountUseTask(name)
                  if (isCodeArg(val)) {
                    useTask.condition = parserForCode()(val)
                  } else {
                    const v = parseBolArg(val)
                    if (v.kind === 'BooleanConst' && v.bool !== true) ws.error('deve ser true ou Code', val)
                  }
                  ret.items.push(useTask)
                  return undefined as any
                }
              }, ['*'])
              // parseColObjArg('UseTaskForks', argNextTask, (itmNextTask) => {
              //   if (itmNextTask instanceof ts.MethodDeclaration) return parserForCode()(itmNextTask)
              //   else return parseUseTask(itmNextTask)
              // })
            }
            else ret.items.push(parseUseTask(argNextTask))
            return ret
          }
          function parseUseView(argUseView: ts.Node): UseView {
            const puseview = parseObjArg(argUseView, {
              view: parseStrArg,
              bind: parseBindVars
            }, [])
            const r: UseView = {
              kind: 'UseView',
              sourceRef: ws.getRef(argUseView),
              ...puseview,
              ref() {
                const v = comp.views.get(puseview.view)
                if (!v) throw ws.fatal('view não encontrada: ' + puseview.view.str, puseview.view)
                return v
              }
            }
            return r
          }
          function parseUseOperation(argUseOperation: ts.Node): UseOperation {
            const puseop = parseObjArg(argUseOperation, {
              operation: parseStrArg,
              input: parseBindVars,
              output: parseBindVars,
            }, [])
            const r: UseOperation = {
              kind: 'UseOperation',
              sourceRef: ws.getRef(argUseOperation),
              ...puseop,
              ref() {
                const f = comp.operations.get(puseop.operation)
                if (!f) throw ws.fatal('operation não encontrada: ' + puseop.operation.str, puseop.operation)
                return f
              }
            }
            return r
          }
        }
      }, ['*'])
      return { operations }
    }
    function operations(expr1Ops: ts.CallExpression) {
      const argsOps = expr1Ops.getArguments()
      if (argsOps.length !== 1) ws.error(expr1Ops.getSourceFile().getFilePath() + ' operations precisa de um parametro', expr1Ops)
      comp.operations = parseColObjArg('Operations', argsOps[0], (itmOp, opName) => {
        const fprops = parseObjArg(itmOp, {
          title: parseI18N,
          level: parseOpLevel,
          cancelabled: parseBolArg,
          input: parseFields,
          output: parseFields,
          code: parserForCode(),
        }, ['cancelabled'])
        const op: Operation = {
          kind: 'Operation',
          sourceRef: ws.getRef(argsOps[0]),
          name: opName,
          nodeMapping: nodeMapping([compid.str, 'function', opName.str], () => op),
          ...fprops,
          defComp: null as any
        }
        return op
        function parseOpLevel(argFuncLevel: ts.Node): OperationLevel {
          const str = parseStrArg(argFuncLevel)
          if (!["cpu", "io", "net"].includes(str.str))
            ws.error('OperationLevel invalido', str)
          const ret: OperationLevel = {
            kind: 'OperationLevel',
            sourceRef: str.sourceRef,
            level: str.str as any
          }
          return ret
        }
      })
      return { views }
    }
    function views(expr1View: ts.CallExpression) {
      const argsview = expr1View.getArguments()
      if (argsview.length !== 1) ws.error(expr1View.getSourceFile().getFilePath() + ' views precisa de um parametro', expr1View)
      comp.views = parseColObjArg('Views', argsview[0], (itmView, viewName) => {
        const vprops = parseObjArg(itmView, {
          title: parseTitle,
          content: parseWidgetContent,
          primaryAction: parseAction,
          secondaryAction: parseAction,
          otherActions: parserForArrArg('otherActions', parseAction),
        }, ['title', 'secondaryAction', 'otherActions'])
        const allActions = arrayConst<'allActions', ViewAction>('allActions', ws.getRef(itmView))
        allActions.items.push(vprops.primaryAction)
        if (vprops.secondaryAction)
          allActions.items.push(vprops.secondaryAction)
        if (vprops.otherActions)
          vprops.otherActions.items.forEach((i) => allActions.items.push(i))
        const view: View = {
          kind: 'View',
          sourceRef: ws.getRef(itmView),
          name: viewName,
          nodeMapping: nodeMapping([compid.str, 'view', viewName.str], () => view),
          allActions,
          refs: null as any,
          ...vprops,
          defComp: null as any
        }
        return view
      })

      return { types }
      function parseWidget(argWidget: ts.Node): WidgetContent | WidgetItem<any> {
        if (getObjArgPropVal(argWidget, 'content') === 'WidgetContent')
          return parseWidgetContent(argWidget)
        return parseWidgetItem(argWidget)
      }
      function parseWidgetContent(argWidget: ts.Node): WidgetContent {
        const cwprops: {
          caption?: I18N,
          widgets: ArrayConst<'Widgets', WidgetContent | WidgetItem<any>>
        } = isArrArg(argWidget) ? {
          widgets: parserForArrArg('Widgets', parseWidget)(argWidget)
        } : parseObjArg(argWidget, {
          caption: parseI18N,
          widgets: parserForArrArg('Widgets', parseWidget),
        }, ['caption'])
        const cwidget: WidgetContent = {
          kind: 'WidgetContent',
          sourceRef: ws.getRef(argWidget),
          ...cwprops
        }
        return cwidget
      }
      function parseWidgetItem(argWidget: ts.Node): WidgetItem<any> {
        if (getObjArgPropVal(argWidget, 'markdown'))
          return parseWidgetMarkdown(argWidget)
        return parseWidgetEntry(argWidget)
      }
      function parseWidgetEntry(argWidget: ts.Node): WidgetEntry {
        const sourceRef = ws.getRef(argWidget)
        const iwprops = parseObjArg(argWidget, {
          caption: parseI18N,
          model: parserForStrArg<"show" | "edit">(),
          field: parseStrArg,
          type: parseUseType
        }, [])
        const iwidget: WidgetEntry = {
          kind: 'WidgetEntry',
          sourceRef,
          widgetFields() {
            const fields = objectConst<'Fields', Field>('Fields', sourceRef)
            const vf: Field = {
              kind: 'Field',
              sourceRef,
              name: iwidget.field,
              type: mountUseType({
                'kind': 'StringConst',
                sourceRef,
                str: 'string'
              })
            }
            fields.add(iwidget.field, vf)
            return fields
          },
          ...iwprops
        }
        return iwidget
      }
      function parseWidgetMarkdown(argWidget: ts.Node): WidgetMarkdown {
        const sourceRef = ws.getRef(argWidget)
        const iwprops = parseObjArg(argWidget, {
          markdown: parseI18N,
        }, [])
        const iwidget: WidgetMarkdown = {
          kind: 'WidgetMarkdown',
          sourceRef,
          ...iwprops,
          widgetFields() {
            const fields = objectConst<'Fields', Field>('Fields', sourceRef)
            return fields
          }
        }
        return iwidget
      }

      function parseAction(argAction: ts.Node): ViewAction {
        const aprops = parseObjArg(argAction, {
          caption: parseI18N,
          description: parseI18N,
          icon: parseIcon,
          isEnabled: parserForCode(),
          isVisible: parserForCode(),
          run(val) {
            if (isStrArg(val)) {
              const str = parseStrArg<"next" | "back">(val)
              if (!['next', 'back'].includes(str.str)) ws.error('Ação inválida: ' + str.str, str)
              return str
            }
            return parserForCode()(val)
          }
        }, ['isEnabled', 'isVisible', 'caption', 'icon', 'description'])
        const viewAction: ViewAction = {
          kind: 'ViewAction',
          sourceRef: ws.getRef(argAction),
          ...aprops
        }
        return viewAction
      }
    }
    function types(expr1type: ts.CallExpression) {
      const argstype = expr1type.getArguments()
      if (argstype.length !== 1) ws.error(expr1type.getSourceFile().getFilePath() + ' types precisa de um parametro', expr1type)
      comp.types = parseColObjArg('Types', argstype[0], (itmType, typeName) => {
        const typeProps = parseObjArg(itmType, {
          base: parseStrArg,
          validate: parserForCode(),
          format: parserForCode(),
          parse: parserForCode(),
          options: parseEnumOptions,
          fields: parseFields,
          itemType: parseUseType,
        }, ['parse', 'format', 'validate', 'options', 'fields', 'itemType'])
        const base = typeProps.base
        delete (typeProps as any).base
        if (typeProps.options) return asEnumType()
        if (typeProps.fields) return asComplexType()
        if (typeProps.itemType) return asArrayType()
        return asNormalType()

        function asNormalType(): NormalType {
          let nbase = (basicTypes3 as any)[base.str]
          if (!nbase) {
            ws.fatal('invalid base type ' + base.str, typeName)
            nbase = basicTypes3.string
          }
          const fbase = nbase.base
          const type: NormalType = {
            kind: 'NormalType',
            sourceRef: ws.getRef(itmType),
            name: typeName,
            nodeMapping: nodeMapping([compid.str, 'type', typeName.str], () => type),
            ...typeProps,
            base: fbase,
            defComp: null as any
          }
          return type
        }
        function asEnumType(): EnumType {
          if (base.str !== 'enum') ws.fatal('esperando base enum', base)
          const etype: EnumType = {
            kind: 'EnumType',
            sourceRef: ws.getRef(itmType),
            name: typeName,
            nodeMapping: nodeMapping([compid.str, 'type', typeName.str], () => etype),
            ...typeProps,
            base() {
              return {
                kind: 'BaseType',
                sourceRef: typeName.sourceRef,
                base: compid.str + '_type_' + typeName.str as any,
                enumOptions: typeProps.options,
                complexFields: false, arrayType: false
              }
            },
            defComp: null as any
          }
          return etype
        }
        function parseEnumOptions(argEnumOptions: ts.Node) {
          return parseColObjArg('EnumOptions', argEnumOptions, (itmOption, opName) => {
            const props = parseObjArg(itmOption, {
              value: parseStrArg,
              description: parseI18N,
              icon: parseIcon,
            }, [])
            const otype: EnumOption = {
              kind: 'EnumOption',
              sourceRef: ws.getRef(itmOption),
              name: opName,
              ...props
            }
            return otype
          })
        }
        function asComplexType(): ComplexType {
          if (base.str !== 'complex') ws.fatal('esperando base complex', base)
          const ctype: ComplexType = {
            kind: 'ComplexType',
            sourceRef: ws.getRef(itmType),
            name: typeName,
            nodeMapping: nodeMapping([compid.str, 'type', typeName.str], () => ctype),
            ...typeProps,
            base() {
              return {
                kind: 'BaseType',
                sourceRef: typeName.sourceRef,
                base: compid.str + '_type_' + typeName.str as any,
                complexFields: typeProps.fields,
                enumOptions: false, arrayType: false
              }
            },
            defComp: null as any
          }
          return ctype
        }
        function asArrayType(): ArrayType {
          if (base.str !== 'array') ws.fatal('esperando base array', base)
          const atype: ArrayType = {
            kind: 'ArrayType',
            sourceRef: ws.getRef(itmType),
            name: typeName,
            nodeMapping: nodeMapping([compid.str, 'type', typeName.str], () => atype),
            ...typeProps,
            base() {
              return {
                kind: 'BaseType',
                sourceRef: typeName.sourceRef,
                base: compid.str + '_type_' + typeName.str as any,
                arrayType: typeProps.itemType,
                enumOptions: false, complexFields: false
              }
            },
            defComp: null as any
          }
          return atype
        }
      })
      return { documents }
    }
    function documents(expr1Doc: ts.CallExpression) {
      const argsDoc = expr1Doc.getArguments()
      if (argsDoc.length !== 1) ws.error(expr1Doc.getSourceFile().getFilePath() + ' documents precisa de um parametro', expr1Doc)
      comp.documents = parseColObjArg('Documents', argsDoc[0], (itmDoc, docName) => {
        const dprops = parseObjArg(itmDoc, {
          caption: parseI18N,
          identification: parserForStrArg<'Centralized' | 'ByPeer'>(),
          primaryFields: parseDocFields,
          secondaryFields: parseDocFields,
          indexes: parseDocIndexes,
          persistence(val) {
            return parseStrArg<'session' | 'persistent'>(val)
          },
          states: parseDocumentStates,
          actions: parseDocActions,
          testdata: parseDocTestingScenarios
        }, ['testdata'])
        const doc: Document = {
          kind: 'Document',
          sourceRef: ws.getRef(itmDoc),
          name: docName,
          refs: null as any,
          nodeMapping: nodeMapping([compid.str, 'document', docName.str], () => doc),
          ...dprops,
          defComp: null as any
        }
        return doc
        function parseDocFields(argFields: ts.Node): DocFields {
          return parseColObjArg('DocFields', argFields, parseDocField)
        }
        function parseDocField(argField: ts.Node, fieldname: StringConst): DocField {
          const fprops = parseObjArg(argField, {
            description: parseI18N,
            type: parseUseType,
          }, [])
          const field: DocField = {
            kind: 'DocField',
            sourceRef: ws.getRef(argField),
            name: fieldname,
            nodeMapping: nodeMapping([compid.str, 'document', docName.str, 'field', fieldname.str], () => field),
            ...fprops
          }
          return field
        }
        function parseDocIndexes(argIndexes: ts.Node): DocIndexes {
          return parseColObjArg('DocIndexes', argIndexes, parseDocIndex)
        }
        function parseDocIndex(argIndex: ts.Node, indexname: StringConst): DocIndex {
          const fields = parserForArrArg('DocIndexFields', parseStrArg)(argIndex)
          const index: DocIndex = {
            kind: 'DocIndex',
            sourceRef: ws.getRef(argIndex),
            name: indexname,
            nodeMapping: nodeMapping([compid.str, 'document', docName.str, 'index', indexname.str], () => index),
            fields
          }
          return index
        }
        function parseDocumentStates(argStates: ts.Node): DocumentStates {
          return parseColObjArg('DocumentStates', argStates, parseDocumentState)
        }
        function parseDocumentState(argState: ts.Node, statename: StringConst): DocumentState {
          const sprops = parseObjArg(argState, {
            icon: parseIcon,
            description: parseI18N
          }, [])
          const state: DocumentState = {
            kind: 'DocumentState',
            sourceRef: ws.getRef(argState),
            name: statename,
            nodeMapping: nodeMapping([compid.str, 'document', docName.str, 'state', statename.str], () => state),
            ...sprops
          }
          return state
        }
        function parseDocActions(argActions: ts.Node): DocActions {
          return parseColObjArg('DocActions', argActions, parseDocAction)
        }
        function parseDocAction(argAction: ts.Node, actionname: StringConst): DocAction {
          const aprops = parseObjArg(argAction, {
            from: parseUseDocStates,
            to: parseUseDocStates,
            icon: parseIcon,
            description: parseI18N,
            run: parserForCode()
          }, ['run', 'from'])
          const ac: DocAction = {
            kind: 'DocAction',
            sourceRef: ws.getRef(argAction),
            name: actionname,
            nodeMapping: nodeMapping([compid.str, 'document', docName.str, 'action', actionname.str], () => ac),
            ...aprops
          }
          return ac
        }
        function parseUseDocStates(argUseDocStates: ts.Node): UseDocStates {
          const useDocStates: UseDocStates = {
            kind: 'UseDocStates',
            sourceRef: ws.getRef(argUseDocStates),
            states: arrayConst<'UsedDocStates', StringConst>('UsedDocStates', ws.getRef(argUseDocStates)),
            ref() {
              return useDocStates.states.items.map((s) => {
                const state = doc.states.get(s)
                if (!state) throw ws.fatal('docstate não existe ' + s.str, s)
                return state
              })
            }
          }
          if (isStrArg(argUseDocStates)) useDocStates.states.items.push(parseStrArg(argUseDocStates))
          else parserForArrArg('UsedDocStates', parseStrArg)(argUseDocStates)
            .items.forEach((i) => useDocStates.states.items.push(i))
          return useDocStates
        }
      })
      return { routes }
    }
    function routes(expr1Route: ts.CallExpression) {
      const argsRoute = expr1Route.getArguments()
      if (argsRoute.length !== 1) ws.error(expr1Route.getSourceFile().getFilePath() + ' routes precisa de um parametro', expr1Route)
      comp.routes = parseRoutes(argsRoute[0])
      return comp
    }

    function parseDocTestingScenarios(argCenario: ts.Node): DocTestingScenarios {
      const r = ws.getRef(argCenario)
      if (isObjArg(argCenario)) {
        const cenarios = objectConst<'DocTestingScenarios', DocTestingCol>(
          'DocTestingScenarios', r)
        parseObjArg(argCenario, {
          '*'(val, name) {
            const testcases = parseDocTestingCol(val)
            cenarios.add(name, testcases)
            return testcases
          }
        }, ['*'])
        return cenarios
      }
      throw ws.fatal('Cenários de teste eram esperados aqui', r)
    }

    function parseDocTestingCol(argCaso: ts.Node): DocTestingCol {
      const r = ws.getRef(argCaso)
      if (isArrArg(argCaso)) {
        const casos = parserForArrArg('DocTestingCol', (item) => {
          const data = parseObjArgAny(item, {
            '*': (val) => val
          }, ['*']) as any
          const caso: DocTestingDoc = {
            kind: 'DocTestingDoc',
            sourceRef: ws.getRef(argCaso),
            data
          }
          return caso
        })(argCaso)
        return casos
      }
      throw ws.fatal('Caso de coleção era esperado aqui', r)
    }
  }

  function createCompRefs(finishedComp: Component) {
    finishedComp.refs = {
      baseTypes: refBaseTypes(finishedComp.types),
      types: createRefs<'RefTypes', Type>('RefTypes', finishedComp, 'types', './'),
      documents: createRefs<'RefDocuments', Document>('RefDocuments', finishedComp, 'documents', './'),
      processes: createRefs<'RefProcesses', Process>('RefProcesses', finishedComp, 'processes', './'),
      roleDefs: createRefs<'RefRoles', RoleDef>('RefRoles', finishedComp, 'roleDefs', './'),
      roleGroups: createRefs<'RefRoles', RoleGroup>('RefRoles', finishedComp, 'roleGroups', './'),
      views: createRefs<'RefViews', View>('RefViews', finishedComp, 'views', './'),
      operations: createRefs<'RefOperations', Operation>('RefOperations', finishedComp, 'operations', './'),
    }
    function createRefs<KIND extends SourceNodeRefsKind, T extends SourceNode<any>>(
      kind: KIND,
      n: SourceNode<any>, kindObj: string, root?: string): ComponentRefs<T> {
      const ret = componentRefs<T>([])
      listrefs(n, '')
      return ret
      function listrefs(sn: SourceNode<any>, ppath: string) {
        const items: ObjectConst<KIND, T> = (sn as any)[kindObj]
        items.props.forEach((item) => {
          const ipath = (ppath ? ppath : root || '') + item.key.str
          const iref = item.val
          if ((iref as any).defComp === null) (iref as any).defComp = n
          ret.items.push({
            path: ipath,
            ref: iref
          })
          if (isDocument(iref)) {
            iref.refs = {
              allFields: null as any,
              primaryFields: createRefs<'RefPrimaryFields', DocField>('RefPrimaryFields', iref, 'primaryFields'),
              secondaryFields: createRefs<'RefSecondaryFields', DocField>('RefSecondaryFields', iref, 'secondaryFields'),
              indexes: createRefs<'RefDocIndexes', DocIndex>('RefDocIndexes', iref, 'indexes'),
              states: createRefs<'RefDocStates', DocumentState>('RefDocStates', iref, 'states'),
              actions: createRefs<'RefDocAction', DocAction>('RefDocAction', iref, 'actions'),
            }
            iref.refs.allFields = componentRefs(
              iref.refs.primaryFields.items.concat(iref.refs.secondaryFields.items)
            )
          }
          if (isProcess(iref)) {
            iref.refs = {
              component: finishedComp,
              vars: refProcessVars(iref.vars)
            }
          }
          if (isView(iref)) {
            iref.refs = {
              fields: refViewFields(iref)
            }
          }
        })
        if (isComponent(sn))
          sn.uses.props.forEach((u) =>
            listrefs(u.val.ref(sn.sourceRef), ppath + u.key.str + '/')
          )
      }
    }
    function refBaseTypes(types: Types) {
      const did: { [name: string]: boolean } = {}
      const ret = componentRefs<BaseType<any>>([])
      types.props.forEach((t) => {
        const base = t.val.base()
        if (normalTypes[base.base]) return
        if (did[base.base]) return
        ret.items.push({
          path: base.base,
          ref: base
        })
        did[base.base] = true
      })
      return ret
    }
    function refProcessVars(vars: ProcessVars) {
      const ret = componentRefs<Field>([]);
      ['input', 'local', 'output'].forEach((scope) => {
        var fields: Fields = (vars as any)[scope];
        fields.props.forEach((f) => {
          const ipath = scope + '.' + f.key.str
          const iref = f.val
          ret.items.push({
            path: ipath, ref: iref
          })
        })
      })
      return ret
    }
    function refViewFields(view: View): Fields {
      const ret = objectConst<'Fields', Field>('Fields', ws.getRef(view))

      view.content.widgets.items.forEach(add)
      function add(w: WidgetContent | WidgetItem<any>) {
        if (isWidgetContent(w)) w.widgets.items.forEach(add)
        else {
          w.widgetFields().props.forEach((field) => {
            if (!ret.props.some((i) => i.key.str === field.key.str)) {
              ret.add(field.key,
                {
                  kind: 'Field',
                  sourceRef: w.sourceRef,
                  name: field.key,
                  type: {
                    kind: 'UseType1',
                    sourceRef: w.sourceRef,
                    type: {
                      kind: 'StringConst',
                      str: 'string',
                      sourceRef: w.sourceRef,
                    },
                    ref(s2) {
                      return basicTypes3.string
                    },
                    base(s2) {
                      return basicTypes3.string.base().base
                    }
                  }
                })
            }
          })
        }
      }

      return ret
    }
  }
}

function invalidComponent(uri: StringConst) {
  const comp: Component = {
    kind: 'Component',
    sourceRef: uri.sourceRef,
    uri: {
      id: uri,
      full: uri,
      ns: uri,
      path: uri
    },
    uses: objectConst('ComponentUses', uri.sourceRef),
    refs: {
      baseTypes: componentRefs([]),
      types: componentRefs([]),
      documents: componentRefs([]),
      processes: componentRefs([]),
      roleDefs: componentRefs([]),
      roleGroups: componentRefs([]),
      views: componentRefs([]),
      operations: componentRefs([]),
    },
    types: objectConst('Types', uri.sourceRef),
    documents: objectConst('Documents', uri.sourceRef),
    processes: objectConst('Processes', uri.sourceRef),
    roleDefs: objectConst('RoleDefs', uri.sourceRef),
    roleGroups: objectConst('RoleGroups', uri.sourceRef),
    views: objectConst('Views', uri.sourceRef),
    operations: objectConst('Operations', uri.sourceRef),
    routes: objectConst('Routes', uri.sourceRef),
  }
  return comp
}

function componentRefs<T extends SourceNode<any>>(items: Array<ComponentRef<T>>): ComponentRefs<T> {
  const ret: ComponentRefs<T> = {
    items: items.slice(0),
    find(path) {
      return ret.items.filter((i) => i.path === path)[0]
    },
  }
  return ret
}

function makeInvalid(ws: Workspace, s: string, sourceRef: SourceRef) {
  ws.error('Invalid type: ' + s, sourceRef)
  const ret: NormalType = {
    kind: basicTypes3.invalid.kind,
    sourceRef,
    base() {
      return {
        kind: 'BaseType',
        sourceRef,
        base: 'invalid',
        enumOptions: false,
        complexFields: false,
        arrayType: false
      }
    },
    nodeMapping: {
      id: 'invalid' + s
    },
    name: {
      kind: 'StringConst',
      sourceRef,
      str: 'invalid ' + s
    },
    defComp: null as any
  }
  return ret
}
