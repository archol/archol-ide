import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst, isBooleanConst, isNumberConst,
  isObjectConst, isSourceNode, isStringConst, Code, isCodeNode, isArrayConst, SourceNodeObjectKind, Workspace, ObjectConstProp, isObjectConstProp, TsNode
} from "load/types"
import { mapObjectToArray } from 'utils'
import {
  quote, NodeTransformer, isNodeTransformer, NodeTransformerFactory, isNodeTransformerFactory,
  GenNodes, GenInfo, GenFunc
} from './generator'
import { Project, TransformTraversalControl, ts, ParameterDeclaration } from 'ts-morph'

export type CodePartLines = Array<CodePartL | null>
export type CodeTraversal = (src: GenInfo<any>) => (traversal: TransformTraversalControl) => ts.Node

export interface CodeWriter {
  statements(lines: CodePartLines, block: boolean): CodeLines
  chipResult(id: string, lines: CodePartLines, block: boolean): ChipRes
  lines(lines: CodePartLines, start: string, end: string, separator: string | { notInLast: string }): CodeLines
  transform(transformer: NodeTransformer<any, any>): CodePartR[]
  transform(node: SourceNode<any>): CodePartR[]
  map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines
  code(node: Code | undefined, opts?: {
    before?: CodePartLines, after?: CodePartLines,
    forceParams?: Array<string | ParameterDeclaration>, beforeParams?: string[], forceRetType?: string,
    forceParamType?: (param: string, idx: number) => string | undefined | false,
    arrow?: boolean,
    declOnly?: boolean
    traversals?: CodeTraversal[]
  }): FuncDecl
  funcDecl(args: string[], ret: string, statements: null | CodePartLines, opts?: { arrow?: boolean, async?: boolean }): FuncDecl
  array(arr: CodePartLines): CodeLines
  property(name: string, val: CodePartL | null): CodeProperty
  mapObj<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(
    objs: ObjectConst<KIND, T> | Array<ObjectConst<KIND, any>>,
    fn?: (val: T, name: StringConst) => CodePartL,
    filter?: (val: T, name: StringConst) => boolean,
    heading?: CodePartLines
  ): CodeLines
  object(obj: { [name: string]: CodePartL }): CodeLines
  object(obj: { [name: string]: CodePartLo }, objNode: SourceNode<any>): CodeLines
  string(node: StringConst | string): string
  stringType(strs: Array<StringConst | string>): string
  resolveCode(code: CodePartR[]): string
}

export type CodePartR = string | string[] | CodeLines | ChipRes | ChipDecl1<any> | ChipDecl2
export type CodePartLb = CodePartR | SourceNode<any> | CodePartLines | FuncDecl |
  NodeTransformer<any, any> | Array<ObjectConstProp<any, any>> | ObjectConstProp<any, any> | CodeProperty
export type CodePartL = CodePartLb | (() => CodePartL)
export type CodePartLo = CodePartLb | (<T extends SourceNodeKind>(n: SourceNode<T>) => CodePartL)
  | NodeTransformerFactory<any, any>

export interface CodeProperty {
  $property$: string
  val: CodePartL | null
}

export interface CodeLine {
  $parts$: CodePartR[]
}

export interface CodeLines {
  $lines$: CodeLine[]
  start: string
  end: string
  separator: string | { notInLast: string }
  insert(ilines: CodePartLines): void
  append(ilines: CodePartLines): void
}

export function isCodeLines(o: any): o is CodeLines {
  return o && (o as any).$lines$
}

export function isCodeLine(o: any): o is CodeLine {
  return o && (o as any).$parts$
}

export function isCodeProperty(o: any): o is CodeProperty {
  return o && (o as any).$property$
}

export interface FuncDecl {
  $func$: {
    args: string[]
    ret: string
    body: null | CodeLines
    arrow?: boolean
    async?: boolean
  }
}

export function isFuncDecl(o: any): o is FuncDecl {
  return o && (o as any).$func$
}

export interface ChipDecl1<CFG2 extends object> {
  $ChipDecl1$: true
  transform(node: SourceNode<any>, info: GenInfo<CFG2>): ChipRes
}

export interface ChipDecl2 {
  transform(): ChipRes
}

export interface ChipRes {
  id: string
  $chip$: CodeLines
  pos: number
}

export function isChipRes(o: any): o is ChipRes {
  return o && (o as any).$chip$
}
export function isChipDecl1<CFG2 extends object>(o: any): o is ChipDecl1<CFG2> {
  return o && (o as any).$ChipDecl1$
}

export function codeWriter<CFG extends object>(transforms: Array<GenNodes<CFG>>, info: GenInfo<CFG>): CodeWriter {
  const wSelf: CodeWriter = {
    statements(statements: CodePartLines, block: boolean): CodeLines {
      return wSelf.lines(statements, block ? '{' : '', block ? '}' : '', ';')
    },
    lines(lines: CodePartLines, start: string, end: string, separator: string): CodeLines {
      return {
        $lines$: flatLines(lines), start, end, separator,
        insert(ilines: CodePartLines): void {
          this.$lines$ = flatLines(ilines).concat(this.$lines$)
        },
        append(ilines: CodePartLines, lineIndex?: number): void {
          this.$lines$ = this.$lines$.concat(flatLines(ilines))
        }
      }
    },
    transform(n: any) {
      if (isNodeTransformer(n))
        return flatPartL(n.transform(transforms, { ...info, cfg: n.transformCFG }))
      return transformNode(n)
    },
    map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines {
      const lines = nodes.reduce<CodePartR[]>((p, c) => {
        if (isObjectConst(c))
          return c.props.map((p) => transformNode(p.val))
        return (c as any).items.map(transformNode)
      }, [])
      return wSelf.lines(lines, '[', ']', ',')
    },
    code(node, opts): FuncDecl {
      let body: CodePartLines = node ? (opts?.traversals ? (() => {
        const tmpp = new Project({ useInMemoryFileSystem: true });
        const tmps = tmpp.createSourceFile(
          "tmp.ts", [
            'function tmp(' + node.params.map((p) => p.getText()) + '):' + node.ret.getText() + '{',
          ].concat(node.body.map(b => b.getText()))
            .concat(['}'])
            .join('\n')
        );
        opts.traversals.forEach(t => tmps.transform(t(info)))
        const nfn = tmps.compilerNode.statements[0]
        if (nfn && ts.isFunctionDeclaration(nfn) && nfn.body)
          return nfn.body.statements.map(s => s.getText())
        throw info.ws.fatal('Erro ao transformar código', node)
      })() : node.body.map((b) => {
        return b.getText()
      })) : []
      let retType = node ? node.ret.getText() : ''
      if (opts) {
        if (opts.before) body = [...opts.before, ...body]
        if (opts.after) body = [...body, ...opts.after]
        if (typeof opts.forceRetType === 'string') retType = opts.forceRetType
      }
      // return wSelf.lines([
      //   ['(', node.params.map(p => p.getText()).join(','), ')', retType ? ':' : '', retType, '=>', body]
      // ], '', '', '')
      //if (!())
      //wSelf.lines(body, '', '', '')
      const params: string[] = (opts && opts.forceParams && tparams(opts.forceParams))
        || (node && tparams(node.params)) || []
      if (opts && opts.beforeParams) params.unshift(...opts.beforeParams)
      return wSelf.funcDecl(
        params,
        retType,
        opts && opts.declOnly ? null : body,
        { async: node ? node.async : false, arrow: opts && opts.arrow }
      )
      function tparams(nparams?: Array<string | ParameterDeclaration>): string[] {
        return nparams ? nparams.map((p, pidx) => {
          let pname: string
          let ptype: string
          if (typeof p === 'string') {
            const ps = p.split(':').map((pi) => pi.trim())
            pname = ps[0]
            ptype = ps[1]
          }
          else {
            pname = p.getName()
            ptype = p.getType().getText()
          }
          if (opts && opts.forceParamType) {
            const s = opts.forceParamType(pname, pidx)
            if (s === false) return ''
            if (s) return pname + ': ' + s
          }
          return pname + (ptype ? ': ' + ptype : '')
        }).filter((s) => !!s) : []
      }
    },
    funcDecl(args: string[], ret: string, statements: null | CodePartLines, opts?): FuncDecl {
      const body = statements && wSelf.statements(statements, true)
      return {
        $func$: {
          args, ret, body, ...opts
        }
      }
    },
    array(arr: CodePartLines): CodeLines {
      return wSelf.lines(arr, '[', ']', ',')
    },
    property(name, val) {
      return {
        $property$: name, val
      }
    },
    mapObj<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(
      objs: ObjectConst<KIND, T> | Array<ObjectConst<KIND, any>>,
      fn?: (val: T, name: StringConst) => CodePartL,
      filter?: (val: T, name: StringConst) => boolean,
      heading?: CodePartLines
    ): CodeLines {
      if (isObjectConst(objs)) objs = [objs]
      const allprops = objs.reduce<Array<ObjectConstProp<KIND, any>>>
        ((ret, o) => ret.concat(o.props), [])
      return wSelf.lines(
        (heading || []).concat(
          allprops
            .filter((i) => filter ? filter(i.val as any, i.key) : true)
            .map((i) => [
              propv(i.key, (fn || transformNode)(i.val as any, i.key))
            ])),
        '{', '}', ',')
    },
    object(obj: { [name: string]: CodePartL | NodeTransformerFactory<any, any> }, node?: SourceNode<any>): CodeLines {
      return wSelf.lines(mapObjectToArray(obj, (val, key) => {
        if (node) {
          const vnode = (isObjectConst(node)) ? node.get(key) : (node as any)[key]
          if (!vnode) throw info.ws.error('propriedade ' + key + ' não existe em ' + node.kind, node)
          if (isChipDecl1(val))
            return propv(key, val.transform(vnode, info))
          else if (isNodeTransformerFactory(val)) {
            return propv(key, val.make(vnode, info.cfg))
          } else if (typeof val === 'function') {
            return propv(key, (val as any)(vnode))
          }
        }
        if (isNodeTransformerFactory(val))
          throw info.ws.fatal('object com TransformerFactory precisa de Node', info.ws.sourceRef)
        return propv(key, val)
      }), '{', '}', ',')
    },
    string(node: StringConst | string | string[]): string {
      if (isStringConst(node)) return quote(node.str)
      if (Array.isArray(node)) return quote(node.join(''))
      return quote(node)
    },
    stringType(strs: Array<StringConst | string>): string {
      const v = strs.map((inode) => {
        if (isStringConst(inode)) return quote(inode.str)
        if (Array.isArray(inode)) return quote(inode.join(''))
        return quote(inode)
      })
      return v.join(' | ')
    },
    chipResult(id, lines, block) {
      return {
        id, pos: 0,
        $chip$: wSelf.statements(lines, block)
      }
    },
    resolveCode(code) {
      return resolveCode(code, transformNode)
    }
  }
  return wSelf

  function propv(key: string | StringConst, v: CodePartL): CodePartL | null {
    const sk = isCodeProperty(v) ? v.$property$ : isStringConst(key) ? key.str : key
    const k = /^\w+$/.test(sk) ? sk : wSelf.string(sk)
    if (isCodeProperty(v)) {
      v = v.val as any
      if (v === undefined) return null
      if (v === null) return null
    }
    if (isFuncDecl(v)) return [v.$func$.async && (v.$func$.body) ? 'async ' : '', k, v]
    if (v)
      return [k, ':', v]
    return k
  }

  function transformNode(n: SourceNode<any>): CodePartR[] {
    try {
      info.stack.items.push(n)
      const w2 = codeWriter(transforms, info)
      for (const t of transforms) {
        const fn: GenFunc<any, any> = (t as any)[n.kind]
        if (fn) return flatPartL(fn(w2, n, info))
      }
      return flatPartL(defaultTransformer(n))
    }
    finally {
      info.stack.items.pop()
    }
  }

  function defaultTransformer(n: SourceNode<any>) {
    if (isStringConst(n)) return wSelf.string(n)
    if (isNumberConst(n)) return n.num.toString()
    if (isBooleanConst(n)) return n.bool ? 'true' : 'false'
    if (isCodeNode(n)) return wSelf.code(n)
    if (isArrayConst(n)) return wSelf.map([n])
    if (isObjectConst(n)) return wSelf.map([n])
    throw info.ws.fatal('Gerador não suporta: ' + n.kind +
      ' / ' + transforms.map((t) => Object.keys(t).join()).join('|') +
      ' stack=' + info.stack.items.map(i => (i as any).kind).join(',')
      , n)
  }

  function flatLines(lines: CodePartLines): CodeLine[] {
    return lines.filter(l => l !== null).map(l => ({
      $parts$: flatPartL(l)
    }))
  }

  function flatPartL(p1: CodePartL | null): CodePartR[] {
    const fres: CodePartR[] = []
    flat(p1)
    return fres
    function flat(p: CodePartL | null) {
      if (p === null) return
      else if (isCodeLines(p)) fres.push(p)
      else if (isFuncDecl(p)) {
        if (p.$func$.arrow && p.$func$.async)
          fres.push('async ')
        fres.push('(')
        fres.push(p.$func$.args.join(', '))
        fres.push(')')
        if (p.$func$.ret) {
          fres.push(':')
          fres.push(p.$func$.ret)
        }
        if (p.$func$.arrow)
          fres.push(' => ')
        if (p.$func$.body)
          fres.push(p.$func$.body)
      }
      // fres.push({
      //   ...p,
      //   $lines$: flatLines(p.$lines$),
      // })
      else if (typeof p === 'string') fres.push(p)
      else if (Array.isArray(p)) return p.forEach(flat)
      else if (isObjectConstProp(p)) flat(p.val)
      else if (isSourceNode(p)) flat(transformNode(p))
      else if (isChipRes(p)) fres.push(p)
      else if (isNodeTransformer(p)) {
        flat(p.transform(transforms, info))
      }
      else if (typeof p === 'function') flat(p())
      else {
        throw new Error('cant flat ' + JSON.stringify(p))
      }
    }
  }

  function resolveCode(code: CodePartR[], resolveNode: (n: SourceNode<any>) => CodePartL): string {
    const txt: string[] = []
    const identstack: string[] = []
    let lineIsEmpty = true
    let ident = ''
    resolveCodeLines(code)
    return txt.join('')

    function write(s: string) {
      if (s) {
        if (lineIsEmpty) txt.push(ident)
        txt.push(s)
        lineIsEmpty = false
      }
    }
    function writeln(s?: string) {
      if (s) {
        if (lineIsEmpty) txt.push(ident)
        txt.push(s)
      }
      txt.push('\n')
      lineIsEmpty = true
    }
    function incIdent() {
      identstack.push(ident)
      if (lineIsEmpty) ident = ident + '  '
    }
    function decIdent() {
      ident = identstack.pop() || ''
    }
    function resolveCodeLines(c: CodePartL) {
      if (isCodeLines(c)) {
        write(c.start)
        c.$lines$
          .filter((l) => l != null)
          .forEach((l, idx, arr) => {
            if (idx === 0 && c.start) writeln()
            const o = txt.length
            incIdent()
            resolveCodePart(l.$parts$)
            decIdent()
            if (c.separator && (!lineIsEmpty) && o < txt.length)
              if (typeof c.separator === 'string') write(c.separator)
              else if (idx < arr.length - 1) write(c.separator.notInLast)
            writeln()
          })
        if (c.end) write(c.end)
      } else resolveCodePart(c)
    }

    function resolveCodePart(c: CodePartL | null) {
      if (c === null) return
      else if (typeof c === 'string') write(c)
      else if (isCodeLines(c)) resolveCodeLines(c)
      else if (Array.isArray(c)) c.forEach(resolveCodePart)
      else if (isSourceNode(c)) resolveCodePart(resolveNode(c))
      else if (isNodeTransformer(c)) {
        resolveCodePart(c.transform(transforms, info))
      }
      else if (typeof c === 'function') resolveCodePart(c())
      else if (isChipRes(c)) write(c.id)
      else {
        throw new Error('cant resolveCodePart ' + typeof c)
      }
    }
  }
}