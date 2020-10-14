import { create } from 'domain';
import { join } from 'path';
import * as ts from 'ts-morph'
import { deferPromise, DeferredPromise, mapObjectToArray } from '../utils';
import {
  Application, ArrayConst, BooleanConst, NumberConst, objectConst, ObjectConst, Package, Role,
  SourceNode, StringConst, Workspace, sysRoles, isDocument,
  Process, Function, View, Type, Document, RoleDef, Code, I18N, arrayConst, Icon, PackageUse, PackageUses,
  Task, UseTask, Roles, UseSysRole, UseLocRole, UseRoles, Fields, Field, UseType, BindVar, ProcessVars,
  UseView, UseFunction, BindVars, FunctionLevel, Widget, ViewAction, BasicType, basicTypes, DocFields, DocIndexes,
  DocumentStates, DocActions, DocAction, DocField, DocIndex, DocumentState, UseDocStates, Routes, Pagelets,
  Pagelet, Menu, MenuItem, MenuItemSeparator, SourceNodeMapped, SourceNodeWithName, isPackage, RouteRedirect, RouteCode, RoleGroup, TsNode, basicTypes3, PackageRefs, PackageRef
} from './types'

export async function loadApp(ws: Workspace, appName: string): Promise<Application> {
  const appsource = ws.ts.getSourceFiles().filter(s => s.getBaseName() === appName + '.app.ts')[0]

  if (!appsource) ws.fatal('Aplicação não encontrada: ' + appName + debugFiles(), ws)
  const mappingList: { [id: string]: SourceNodeMapped<any> } = {}
  const mappingPending: Array<Promise<any>> = []
  const appPackagesDef: { [pkgFullUri: string]: DeferredPromise<Package> } = {}
  const appPackages: { [pkgFullUri: string]: Package } = {}
  let appsysroles: Roles

  const stmts = appsource.getStatements();
  if (stmts.length != 1) ws.fatal(appsource.getFilePath() + ' só deveria ter uma declaração', appsource)
  const stmt = stmts[0]
  if (stmt instanceof ts.ExpressionStatement) {
    const expr1 = stmt.getExpression()
    if (expr1 instanceof ts.CallExpression) {
      const app = await tsCallExpr<Application>(expr1, 'declareApplication')
      await Promise.all(mappingPending)
      return app
    }
  }
  throw ws.fatal(appsource.getFilePath() + ' comando deveria ser declareApplication ou declarePackage', appsource)

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
    } else if (fn === 'declarePackage') {
      if (args.length !== 2) ws.error(expr1.getSourceFile().getFilePath() + ' declarePackage precisa de dois parametros', expr1)
      const pkgns = parseStrArg(args[0])
      const pkgpath = parseStrArg(args[1])
      return declarePackage(pkgns, pkgpath) as any
    }
    throw ws.fatal(expr1.getSourceFile().getFilePath() + ' declareApplication ou declarePackage era esperado', expr1)
  }

  function parseAnyArg(propValue: any): any {
    let ret: any = undefined
    if (propValue instanceof ts.ObjectLiteralExpression) {
      ret = objectConst(ws.getRef(propValue))
      parseObjArg(propValue, {
        '*'(val, name) {
          ret.add(name, parseAnyArg(val))
          return name
        }
      })
    } else if (propValue instanceof ts.ArrayLiteralExpression) ret = parserForArrArg(parseAnyArg)(propValue)
    else if (isStrArg(propValue)) ret = parseNumArg(propValue)
    else if (propValue instanceof ts.NumericLiteral) ret = parseNumArg(propValue)
    else if (propValue instanceof ts.BooleanLiteral) ret = parseBolArg(propValue)
    else ws.error(propValue.getText() + ': tipo de dado não tratado', propValue)
    return ret
  }

  function isStrArg(arg: ts.Node) {
    return (arg instanceof ts.StringLiteral) ||
      (arg instanceof ts.NoSubstitutionTemplateLiteral) ||
      (arg instanceof ts.TaggedTemplateExpression)
  }

  function isObjArg(arg: ts.Node) {
    return (arg instanceof ts.ObjectLiteralExpression)
  }

  function isArrArg(arg: ts.Node) {
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

  function parseBasicType(arg: ts.Node): BasicType {
    const str = parseStrArg(arg)
    if (!Object.keys(basicTypes).includes(str.str)) ws.error('Invalid basic type ' + str.str, str)
    const ret: BasicType = {
      kind: str.str as any,
      sourceRef: str.sourceRef
    }
    return ret
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

  function parserForCode(validate?: (params: ts.ParameterDeclaration[], retType: ts.Type) => boolean) {
    return (argCode: ts.Node): Code => {
      let ret: Code = null as any
      if (argCode instanceof ts.MethodDeclaration) {
        rcode(
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements())
      }
      else if (argCode instanceof ts.FunctionDeclaration) {
        rcode(
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements())
      }
      else if (argCode instanceof ts.FunctionExpression) {
        rcode(
          argCode.getTypeParameters(),
          argCode.getParameters(),
          argCode.getReturnType(),
          argCode.getStatements())
      }
      else ws.error(argCode.getSourceFile().getFilePath() + ' ' + argCode.getText() + ' boolean é esperada', argCode)
      return ret

      function rcode(
        typedParams: ts.TypeParameterDeclaration[],
        params: ts.ParameterDeclaration[],
        retType: ts.Type,
        body: ts.Statement[]): void {
        if (typedParams?.length) ws.error('não suporta typedparams ', argCode)
        if (validate) ws.fatal('TODO', argCode)
        ret = {
          kind: 'Code',
          sourceRef: ws.getRef(argCode),
          params,
          ret: retType,
          body
        }
      }
    }
  }

  function getMapped<KIND extends string, T extends SourceNodeMapped<KIND>>(
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
    props: PROPS
  ): ParsedObjProps<PROPS> {
    return parseObjArgAny(arg, props)
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
    arg: ts.Node,
    props: PROPS
  ): ParsedObjPropsAny<PROPS> {
    let ret: ParsedObjPropsAny<PROPS> = {} as any
    if (arg instanceof ts.ObjectLiteralExpression) {
      for (const p of arg.getProperties()) {
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
        } else ws.error(p.getText() + ': tipo de propriedade não tratado', p)
        // ts.PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | ts.MethodDeclaration | AccessorDeclaration;

        //ts.NoSubstitutionTemplateLiteral | TemplateExpression | ts.BooleanLiteral |  ts.StringLiteral | ts.NumericLiteral | ObjectLiteralElementLike
        //arg.getLiteralValue()
      }
    } else ws.fatal(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' objeto é esperado', arg)
    return ret
    function invokeProp(propNode: ts.PropertyName, propName: StringConst, propValue: ts.Node) {
      let fn = (props as any)[propName.str]
      fn = (props as any)[fn ? propName.str : '*']
      if (!fn) ws.fatal('Não é possível interpretar a propriedade: ' + propName.str, propNode);
      try {
        (ret as any)[propName.str] = fn(propValue, propName);
      } catch (e) {
        if (!fn) ws.fatal('Erro interpretar a propriedade: ' + propName.str + ' ' + e.message, propNode);
      }
    }
  }

  function parseColObjArg<T extends SourceNode<any>>(arg: ts.Node, fn: (itm: ts.Node, name: StringConst) => T): ObjectConst<T> {
    const col = objectConst<T>(ws.getRef(arg))
    parseObjArg(arg, {
      '*'(val, name) {
        const t: T = fn(val, name)
        col.add(name, t)
        return t
      }
    })
    return col
  }

  function parserForArrArg<T extends SourceNode<any>>(fn: (itm: ts.Node) => T): (arg: ts.Node) => ArrayConst<T> {
    return (arg: ts.Node) => {
      let ret: ArrayConst<T> = undefined as any
      if (arg instanceof ts.ArrayLiteralExpression) {
        ret = arrayConst(ws.getRef(arg))
        ret.items = arg.getElements().map(fn)
      } else ws.error(arg.getSourceFile().getFilePath() + ' ' + arg.getText() + ' Array é esperado', arg)
      return ret
    }
  }

  function parseI18N(arg: ts.Node): I18N {
    // todo PARAMS
    const ret: I18N = {
      kind: "I18N",
      sourceRef: ws.getRef(arg),
      msg: objectConst<StringConst>(ws.getRef(arg))
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
      })
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
    const appprops: Omit<Omit<Omit<Omit<Omit<Omit<Application, 'kind'>, 'sourceRef'>, 'name'>, 'getMapped'>, 'allPackages'>, 'mappingList'>
      = parseObjArg(opts, {
        description: parseI18N,
        icon: parseIcon,
        uses: parsePackageUses,
        langs: parserForArrArg(parseStrArg),
        builders: parseAnyArg,
        mappings: parseAnyArg,
        pagelets: parsePagelets,
        routes: parseRoutes,
        menu: parseMenu,
        sysroles(val) {
          return parseRoles(name)(val, true)
        }
      })
    appsysroles = appprops.sysroles
    appprops.uses = await packageUsesWaitter(appprops.uses)
    const app: Application = {
      ...appprops,
      kind: 'Application',
      sourceRef: ws.getRef(name),
      name,
      allPackages: mapObjectToArray(appPackages, (p) => p),
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
    //       return pkguse
    //     }
    //   })
    //   return ret
    // }
    // function parseAppMappings(): any {
    //   x
    // }
  }

  function parsePackageUses(arg: ts.Node): PackageUses {
    return parseColObjArg(arg, (argUri, alias) => {
      const uri = parseStrArg(argUri)
      loadPkg(uri)
      const pkguse: PackageUse = {
        kind: 'PackageUse',
        sourceRef: ws.getRef(argUri),
        alias,
        uri,
        ref(sourceRef) {
          const p = appPackages[uri.str]
          if (!p) throw ws.fatal('pkg not found ' + uri.str, sourceRef)
          return p
        },
        get promise() {
          return appPackagesDef[uri.str].promise
        }
      }
      return pkguse
    })
  }

  async function packageUsesWaitter(packageUses: PackageUses): Promise<PackageUses> {
    if (packageUses.props.length)
      await Promise.all(packageUses.props.map((i) => i.val.promise))
    return packageUses
  }

  function parseRoutes(argRoutes: ts.Node): Routes {
    return parseColObjArg(argRoutes, (itmRoute, itmName) => {
      if (isStrArg(itmRoute)) {
        const redirect = parseStrArg(itmRoute)
        const rr: RouteRedirect = {
          kind: 'RouteRedirect',
          sourceRef: redirect.sourceRef,
          path: itmName,
          redirect
        }
        return rr
      } else {
        const code = parserForCode()(itmRoute)
        const rc: RouteCode = {
          kind: 'RouteCode',
          sourceRef: code.sourceRef,
          path: itmName,
          code
        }
        return rc
      }
    })
  }

  function parsePagelets(argPagelets: ts.Node): Pagelets {
    return parseColObjArg(argPagelets, (itmPagelet, pageletName) => {
      const pprops = parseObjArg(itmPagelet, {
        left: parseNumArg,
        top: parseNumArg,
        right: parseNumArg,
        bottom: parseNumArg,
        drawer: parseBolArg,
        content: parseBolArg
      })
      const pagelet: Pagelet = {
        kind: 'Pagelet',
        sourceRef: ws.getRef(itmPagelet),
        name: pageletName,
        ...pprops
      }
      return pagelet
    })
  }

  function parseMenu(argMenu: ts.Node): Menu {
    return parserForArrArg((itmMenu) => {
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
        run(val): StringConst | Code {
          if (isStrArg(val)) return parseStrArg(val)
          return parserForCode()(val)
        }
      })
      const menuItem: MenuItem = {
        kind: 'MenuItem',
        sourceRef: ws.getRef(itmMenu),
        ...pprops
      }
      return menuItem
    })(argMenu)
  }

  function parseRoles(parent: StringConst) {
    return (arg: ts.Node, sys: boolean): Roles => {
      const roles = parseColObjArg(arg, (itm, name) => {
        if (isObjArg(itm)) {
          const rprops = parseObjArg(itm, {
            description: parseI18N,
            icon: parseIcon,
          })
          const role: RoleDef = {
            kind: 'Role',
            sourceRef: ws.getRef(itm),
            nodeMapping: nodeMapping([parent.str, 'role', name.str], () => role),
            name,
            ...rprops
          }
          return role;
        } else return parserForArrArg(parseStrArg)(itm) as RoleGroup
      })
      sysRoles.forEach((dr) => {
        const er = roles.get(dr)
        if (er && (!sys)) ws.error('Role ' + dr + ' yet exists', er)
        if ((!er) && sys) ws.error('Role ' + dr + ' não é de sistema', roles)
      })
      return roles
    }
  }

  async function loadPkg(pkguri: StringConst): Promise<void> {

    let pkgdecl = appPackagesDef[pkguri.str]
    if (pkgdecl) return

    appPackagesDef[pkguri.str] = deferPromise()
    try {

      const expectedFile = ws.path + '/ws/' + pkguri.str + '.pkg.ts'
      const pkgsource = ws.ts.getSourceFiles().filter(s => s.getFilePath() === expectedFile)[0]

      if (!pkgsource) {
        ws.error('Pacote não encontrado: ' + pkguri.str + debugFiles(), pkguri)
        appPackages[pkguri.str] = invalidPackage(pkguri)
        appPackagesDef[pkguri.str].resolve(appPackages[pkguri.str])
        return
      }

      const stmts = pkgsource.getStatements();
      if (stmts.length != 1) ws.fatal(pkgsource.getFilePath() + ' só deveria ter uma declaração', pkgsource)
      const stmt = stmts[0]
      if (stmt instanceof ts.ExpressionStatement) {
        const expr1 = stmt.getExpression()
        if (expr1 instanceof ts.CallExpression) {
          const p = await tsCallExpr<Package>(expr1, 'declarePackage')
          createPkgRefs(p)
          appPackagesDef[pkguri.str].resolve(p)
          return
        }
      }
      throw ws.fatal(pkgsource.getFilePath() + ' comando deveria ser declareApplication ou declarePackage', pkgsource)
    } catch (e) {
      appPackagesDef[pkguri.str].reject(e)
      console.log(e)
      throw e
    }
  }

  async function declarePackage(pkgns: StringConst, pkgpath: StringConst) {
    const pkgfull: StringConst = {
      kind: 'StringConst',
      sourceRef: {
        ...pkgns.sourceRef,
        end: pkgpath.sourceRef.end
      },
      str: join(pkgns.str, pkgpath.str)
    }
    if (!appPackagesDef[pkgfull.str]) throw ws.fatal('package não definido' + pkgfull.str, pkgfull)

    const pkgid: StringConst = {
      kind: 'StringConst',
      sourceRef: pkgfull.sourceRef,
      str: pkgfull.str.replace(/[\/\.]/g, '_').replace(/[^\w.]/g, '')
    }
    const pkguri = {
      id: pkgid,
      full: pkgfull,
      ns: pkgns,
      path: pkgpath
    }
    const pkg: Package = {
      kind: 'Package',
      sourceRef: ws.getRef(pkgfull),
      uri: pkguri,
    } as any
    appPackages[pkgfull.str] = pkg

    return { uses }

    function packageGetRef<KIND extends string, T extends SourceNodeMapped<KIND>>(opts: {
      refId: StringConst,
      kind: KIND,
      where: keyof Package,
      isInternal: (str: string) => T | false
      invalid: (str: string) => Omit<Omit<T, 'sourceRef'>, 'kind'>
    }): (sourceRefGet: TsNode) => T {
      return (sourceRefGet: TsNode | null) => {
        const internal = opts.isInternal(opts.refId.str)
        if (internal) return internal as any

        let tn = opts.refId.str
        if (tn.includes('/')) {
          const parts = tn.split('/')
          if (parts.length === 2) {
            const t = tryPkg(parts[0], parts[1])
            if (t) return t
          }
        } else tn = pkgid.str + '.type.' + tn

        const inv: T = {
          ...opts.invalid(tn),
          kind: opts.kind as any,
          sourceRef: sourceRefGet
        } as any
        return inv
        function tryPkg(pkgalias: string, typename: string): T | undefined {
          let p: Package | undefined = pkg
          if (pkgalias !== '.') {
            const pa = pkg.uses.get(pkgalias)
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

    function parseUseRoles(argUseRoles: ts.Node): UseRoles {
      if (argUseRoles instanceof ts.ArrayLiteralExpression) {
        const el = argUseRoles.getElements()
        if (el.length === 0) ws.error('need role', argUseRoles)
        if (el.length === 1) return r1(el[0])
        const roles = parserForArrArg(parseStrArg)(argUseRoles)
        roles.items.some((r) => {
          if (sysRoles.includes(r.str)) ws.error('Role de sistema não pode ser combinado com outros', r)
        })
        const ret: UseLocRole = {
          kind: 'UseLocRole',
          sourceRef: ws.getRef(argUseRoles),
          roles,
          ref() {
            return roles.items.map((r) => {
              const l = pkg.roles.get(r)
              if (!l) throw ws.error('Role não encontrado: ' + r.str, r)
              return l
            })
          }
        }
        return ret
      }
      return r1(argUseRoles)
      function r1(arg1: ts.Node): any {
        const str = parseStrArg(arg1)
        if (sysRoles.includes(str.str)) {
          const rs: UseSysRole = {
            kind: 'UseSysRole',
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
        const ret: UseLocRole = {
          kind: 'UseLocRole',
          sourceRef: str.sourceRef,
          roles: {
            kind: 'ArrayConst',
            sourceRef: str.sourceRef,
            items: [
              str
            ]
          },
          ref() {
            const l = pkg.roles.get(str)
            if (!l) throw ws.error('Role não encontrado: ' + str.str, str)
            return [l]
          }
        }
        return ret
      }
    }
    function parseUseType(argUseType: ts.Node): UseType {
      const str = parseStrArg(argUseType)
      const ret: UseType = {
        kind: 'UseType',
        sourceRef: str.sourceRef,
        type: str,
        ref: packageGetRef({
          kind: 'Type',
          refId: str,
          where: 'types',
          isInternal: (s) => (basicTypes3 as any)[s],
          invalid(s) {
            return {
              base: 'invalid_' + s
            }
          }
        })
      }
      return ret
    }
    function parseFields(argf: ts.Node): Fields {
      return parseColObjArg(argf, (itm, name) => {
        const fprops = parseObjArg(itm, {
          description: parseStrArg,
          type: parseUseType,
        })
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
      pkg.uses = await packageUsesWaitter(parsePackageUses(argsUses[0]))
      return { roles }
    }
    function roles(expr1Roles: ts.CallExpression) {
      const args = expr1Roles.getArguments()
      if (args.length !== 1) ws.error(expr1Roles.getSourceFile().getFilePath() + ' roles precisa de um parametro', expr1Roles)
      pkg.roles = parseRoles(pkgid)(args[0], false)
      return { processes }
    }
    function processes(expr1Process: ts.CallExpression) {
      const argsProc = expr1Process.getArguments()
      if (argsProc.length !== 1) ws.error(expr1Process.getSourceFile().getFilePath() + ' processes precisa de um parametro', expr1Process)
      pkg.processes = objectConst(ws.getRef(argsProc[0]))
      parseObjArg(argsProc[0], {
        '*'(val, processName) {
          const pprops = parseObjArg(val, {
            title: parseI18N,
            caption: parseI18N,
            icon: parseIcon,
            start: parseUseTask,
            tasks: parseTasks,
            vars: parseVars,
            roles: parseUseRoles,
            volatile: parseBolArg,
          })
          const process: Process = {
            kind: 'Process',
            sourceRef: ws.getRef(processName),
            name: processName,
            nodeMapping: nodeMapping([pkgid.str, 'process', processName.str], () => process),
            ...pprops
          }
          pkg.processes.props.push({
            key: processName, val: process
          })
          return process

          function parseVars(argVars: ts.Node) {
            const pvars = parseObjArg(argVars, {
              input: parseFields,
              output: parseFields,
              local: parseFields,
            })
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
            return parseColObjArg(argBindVars, (itmBindVar) => {
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
            return parseColObjArg(argTasks, (val, taskname) => {
              const tprops = parseObjArg(val, {
                pool: parseStrArg,
                lane: parseStrArg,
                roles: parseUseRoles,
                next: parseNextTask,
                useView: parseUseView,
                useFunction: parseUseFunction
              })
              const task: Task = {
                kind: tprops.useFunction ? 'SystemTask' : 'UITask',
                sourceRef: ws.getRef(val),
                name: taskname,
                ...tprops
              } as any
              return task
            })
          }
          function parseUseTask(argUseTask: ts.Node): UseTask {
            const taskname = parseStrArg(argUseTask)
            const ret: UseTask = {
              kind: 'UseTask',
              sourceRef: ws.getRef(argUseTask),
              task: taskname,
              ref() {
                const r = process.tasks.get(taskname)
                if (!r) throw ws.error('Tarefa não encontrada: ' + taskname, taskname)
                return r
              }
            }
            return ret
          }
          function parseNextTask(argNextTask: ts.Node): UseTask | ArrayConst<UseTask> | ObjectConst<Code | UseTask> {
            if (argNextTask instanceof ts.ArrayLiteralExpression) {
              return parserForArrArg(parseUseTask)(argNextTask)
            }
            else if (argNextTask instanceof ts.ObjectLiteralExpression) {
              return parseColObjArg(argNextTask, (itmNextTask) => {
                if (itmNextTask instanceof ts.MethodDeclaration) return parserForCode()(itmNextTask)
                else return parseUseTask(itmNextTask)
              })
            }
            else return parseUseTask(argNextTask)
          }
          function parseUseView(argUseView: ts.Node): UseView {
            const puseview = parseObjArg(argUseView, {
              view: parseStrArg,
              bind: parseBindVars
            })
            const r: UseView = {
              kind: 'UseView',
              sourceRef: ws.getRef(argUseView),
              ...puseview,
              ref() {
                const v = pkg.views.get(puseview.view)
                if (!v) throw ws.fatal('view não encontrada: ' + puseview.view.str, puseview.view)
                return v
              }
            }
            return r
          }
          function parseUseFunction(argUseFunction: ts.Node): UseFunction {
            const pusefunc = parseObjArg(argUseFunction, {
              function: parseStrArg,
              input: parseBindVars,
              output: parseBindVars,
            })
            const r: UseFunction = {
              kind: 'UseFunction',
              sourceRef: ws.getRef(argUseFunction),
              ...pusefunc,
              ref() {
                const f = pkg.functions.get(pusefunc.function)
                if (!f) throw ws.fatal('function não encontrada: ' + pusefunc.function.str, pusefunc.function)
                return f
              }
            }
            return r
          }
        }
      })
      return { functions }
    }
    function functions(expr1Functions: ts.CallExpression) {
      const argsFunctions = expr1Functions.getArguments()
      if (argsFunctions.length !== 1) ws.error(expr1Functions.getSourceFile().getFilePath() + ' functions precisa de um parametro', expr1Functions)
      pkg.functions = parseColObjArg(argsFunctions[0], (itmFunction, functionName) => {
        const fprops = parseObjArg(itmFunction, {
          level: parseFunctionLevel,
          input: parseFields,
          output: parseFields,
          code: parserForCode(),
        })
        const func: Function = {
          kind: 'Function',
          sourceRef: ws.getRef(argsFunctions[0]),
          name: functionName,
          nodeMapping: nodeMapping([pkgid.str, 'function', functionName.str], () => func),
          ...fprops
        }
        return func
        function parseFunctionLevel(argFuncLevel: ts.Node): FunctionLevel {
          const str = parseStrArg(argFuncLevel)
          if (!["cpu", "io", "net"].includes(str.str))
            ws.error('FunctionLevel invalido', str)
          const ret: FunctionLevel = {
            kind: 'FunctionLevel',
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
      pkg.views = parseColObjArg(argsview[0], (itmView, viewName) => {
        const vprops = parseObjArg(itmView, {
          content: parserForArrArg(parseWidget),
          primaryAction: parseAction,
          secondaryAction: parseAction,
          othersActions: parserForArrArg(parseAction)
        })
        const allActions = arrayConst<ViewAction>(ws.getRef(itmView))
        allActions.items.push(vprops.primaryAction)
        if (vprops.secondaryAction)
          allActions.items.push(vprops.secondaryAction)
        if (vprops.othersActions)
          vprops.othersActions.items.forEach((i) => allActions.items.push(i))
        const view: View = {
          kind: 'View',
          sourceRef: ws.getRef(itmView),
          name: viewName,
          nodeMapping: nodeMapping([pkgid.str, 'view', viewName.str], () => view),
          allActions,
          ...vprops
        }
        return view
      })

      return { types }
      function parseWidget(argWidget: ts.Node): Widget {
        const wprops = parseObjArg(argWidget, {
          content: parserForArrArg(parseWidget),
          caption: parseI18N,
          model: parserForStrArg<"show" | "edit">(),
          field: parseStrArg,
          type: parseUseType
        })
        const widget: Widget = {
          kind: wprops.content ? 'WidgetContent' : 'WidgetItem',
          sourceRef: ws.getRef(argWidget),
          ...wprops
        } as any
        return widget
      }
      function parseAction(argAction: ts.Node): ViewAction {
        const aprops = parseObjArg(argAction, {
          caption: parseI18N,
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
        })
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
      pkg.types = parseColObjArg(argstype[0], (itmType, typeName) => {
        const tprops = parseObjArg(itmType, {
          base: parseBasicType,
          validate: parserForCode(),
          format: parserForCode(),
          parse: parserForCode(),
        })
        const type: Type = {
          kind: 'Type',
          sourceRef: ws.getRef(itmType),
          name: typeName,
          nodeMapping: nodeMapping([pkgid.str, 'type', typeName.str], () => type),
          ...tprops
        }
        return type
      })
      return { documents }
    }
    function documents(expr1Doc: ts.CallExpression) {
      const argsDoc = expr1Doc.getArguments()
      if (argsDoc.length !== 1) ws.error(expr1Doc.getSourceFile().getFilePath() + ' documents precisa de um parametro', expr1Doc)
      pkg.documents = parseColObjArg(argsDoc[0], (itmDoc, docName) => {
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
        })
        const doc: Document = {
          kind: 'Document',
          sourceRef: ws.getRef(itmDoc),
          name: docName,
          refs: null as any,
          nodeMapping: nodeMapping([pkgid.str, 'document', docName.str], () => doc),
          ...dprops
        }
        return doc
        function parseDocFields(argFields: ts.Node): DocFields {
          return parseColObjArg(argFields, parseDocField)
        }
        function parseDocField(argField: ts.Node, fieldname: StringConst): DocField {
          const fprops = parseObjArg(argField, {
            description: parseI18N,
            type: parseStrArg,
          })
          const field: DocField = {
            kind: 'DocField',
            sourceRef: ws.getRef(argField),
            name: fieldname,
            nodeMapping: nodeMapping([pkgid.str, 'document', docName.str, 'field', fieldname.str], () => field),
            ...fprops
          }
          return field
        }
        function parseDocIndexes(argIndexes: ts.Node): DocIndexes {
          return parseColObjArg(argIndexes, parseDocIndex)
        }
        function parseDocIndex(argIndex: ts.Node, indexname: StringConst): DocIndex {
          const fields = parserForArrArg(parseStrArg)(argIndex)
          const index: DocIndex = {
            kind: 'DocIndex',
            sourceRef: ws.getRef(argIndex),
            name: indexname,
            nodeMapping: nodeMapping([pkgid.str, 'document', docName.str, 'index', indexname.str], () => index),
            fields
          }
          return index
        }
        function parseDocumentStates(argStates: ts.Node): DocumentStates {
          return parseColObjArg(argStates, parseDocumentState)
        }
        function parseDocumentState(argState: ts.Node, statename: StringConst): DocumentState {
          const sprops = parseObjArg(argState, {
            icon: parseIcon,
            description: parseI18N
          })
          const state: DocumentState = {
            kind: 'DocumentState',
            sourceRef: ws.getRef(argState),
            name: statename,
            nodeMapping: nodeMapping([pkgid.str, 'document', docName.str, 'state', statename.str], () => state),
            ...sprops
          }
          return state
        }
        function parseDocActions(argActions: ts.Node): DocActions {
          return parseColObjArg(argActions, parseDocAction)
        }
        function parseDocAction(argAction: ts.Node, actionname: StringConst): DocAction {
          const aprops = parseObjArg(argAction, {
            from: parseUseDocStates,
            to: parseUseDocStates,
            icon: parseIcon,
            description: parseI18N,
            run: parserForCode()
          })
          const ac: DocAction = {
            kind: 'DocAction',
            sourceRef: ws.getRef(argAction),
            name: actionname,
            nodeMapping: nodeMapping([pkgid.str, 'document', docName.str, 'action', actionname.str], () => ac),
            ...aprops
          }
          return ac
        }
        function parseUseDocStates(argUseDocStates: ts.Node): UseDocStates {
          const useDocStates: UseDocStates = {
            kind: 'UseDocStates',
            sourceRef: ws.getRef(argUseDocStates),
            states: arrayConst<StringConst>(ws.getRef(argUseDocStates)),
            ref() {
              return useDocStates.states.items.map((s) => {
                const state = doc.states.get(s)
                if (!state) throw ws.fatal('docstate não existe ' + s.str, s)
                return state
              })
            }
          }
          if (isStrArg(argUseDocStates)) useDocStates.states.items.push(parseStrArg(argUseDocStates))
          else parserForArrArg(parseStrArg)(argUseDocStates).items.forEach((i) => useDocStates.states.items.push(i))
          return useDocStates
        }
      })
      return { routes }
    }
    function routes(expr1Route: ts.CallExpression) {
      const argsRoute = expr1Route.getArguments()
      if (argsRoute.length !== 1) ws.error(expr1Route.getSourceFile().getFilePath() + ' routes precisa de um parametro', expr1Route)
      pkg.routes = parseRoutes(argsRoute[0])
      return pkg
    }
  }

  function createPkgRefs(finishedPkg: Package) {
    finishedPkg.refs = {
      types: createRefs<Type>(finishedPkg, 'types', './'),
      documents: createRefs<Document>(finishedPkg, 'documents', './'),
      processes: createRefs<Process>(finishedPkg, 'processes', './'),
      roles: createRefs<Role>(finishedPkg, 'roles', './'),
      views: createRefs<View>(finishedPkg, 'views', './'),
      functions: createRefs<Function>(finishedPkg, 'functions', './'),
    }
    function createRefs<T extends SourceNode<any>>(n: SourceNode<any>, kindObj: string, root?: string): PackageRefs<T> {
      const ret: PackageRefs<T> = {
        items: [],
      }
      listrefs(n, '')
      return ret
      function listrefs(sn: SourceNode<any>, ppath: string) {
        const items: ObjectConst<T> = (sn as any)[kindObj]
        items.props.forEach((item) => {
          const ipath = (ppath ? ppath : root || '') + item.key.str
          const iref = item.val
          ret.items.push({
            path: ipath,
            ref: iref
          })
          if (isDocument(iref)) {
            if (kindObj === 'documents') {
              iref.refs = {
                allFields: null as any,
                primaryFields: createRefs<DocField>(iref, 'primaryFields'),
                secondaryFields: createRefs<DocField>(iref, 'secondaryFields'),
                indexes: createRefs<DocIndex>(iref, 'indexes'),
                states: createRefs<DocumentState>(iref, 'states'),
                actions: createRefs<DocAction>(iref, 'actions'),
              }
              iref.refs.allFields = {
                items: iref.refs.primaryFields.items.concat(iref.refs.secondaryFields.items)
              }
            }
          }
        })
        if (isPackage(sn))
          sn.uses.props.forEach((u) =>
            listrefs(u.val.ref(sn.sourceRef), ppath + u.key.str + '/')
          )
      }
    }
  }
}

function invalidPackage(uri: StringConst) {
  const pkg: Package = {
    kind: 'Package',
    sourceRef: uri.sourceRef,
    uri: {
      id: uri,
      full: uri,
      ns: uri,
      path: uri
    },
    uses: objectConst(uri.sourceRef),
    refs: {
      types: packageRefs(),
      documents: packageRefs(),
      processes: packageRefs(),
      roles: packageRefs(),
      views: packageRefs(),
      functions: packageRefs(),
    },
    types: objectConst(uri.sourceRef),
    documents: objectConst(uri.sourceRef),
    processes: objectConst(uri.sourceRef),
    roles: objectConst(uri.sourceRef),
    views: objectConst(uri.sourceRef),
    functions: objectConst(uri.sourceRef),
    routes: objectConst(uri.sourceRef),
  }
  return pkg
  function packageRefs(): PackageRefs<any> {
    return {
      items: [],
    }
  }
}