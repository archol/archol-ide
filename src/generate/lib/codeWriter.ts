import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst,
  isObjectConst, isSourceNode, isStringConst, Code, isCode, isArrayConst, SourceNodeObjectKind, Workspace, ObjectConstProp, isObjectConstProp
} from "load/types"
import { mapObjectToArray } from 'utils'
import {
  quote, NodeTransformer, isNodeTransformer, NodeTransformerFactory, isNodeTransformerFactory,
  GenNodes, GenInfo, GenFunc
} from './generator'

export interface CodeWriter {
  statements(lines: CodePartL[], block: boolean): CodeLines
  lines(lines: CodePartL[], start: string, end: string, separator: string): CodeLines
  transform(node: SourceNode<any>): CodePartR[]
  map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines
  mapObj<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(
    objs: ObjectConst<KIND, T> | Array<ObjectConst<KIND, any>>,
    fn?: (val: T, name: StringConst) => CodePartL,
    filter?: (val: T, name: StringConst) => boolean,
    heading?: CodePartL[]
  ): CodeLines
  code(node: Code, opts?: { after?: CodePartL[], forceRetType?: string }): MethodDecl
  methodDecl(args: string[], ret: string, statements: null | CodePartL[]): MethodDecl
  array(arr: CodePartL[]): CodeLines
  object(obj: { [name: string]: CodePartL }): CodeLines
  object(obj: { [name: string]: CodePartLo }, objNode: SourceNode<any>): CodeLines
  string(node: StringConst | string): string
  resolveCode(code: CodePartR[]): string
}

export type CodePartR = string | string[] | CodeLines
export type CodePartLb = CodePartR | SourceNode<any> | CodePartL[] | MethodDecl |
  NodeTransformer<any, any> | Array<ObjectConstProp<any, any>> | ObjectConstProp<any, any>
export type CodePartL = CodePartLb | (() => CodePartL)
export type CodePartLo = CodePartLb | (<T extends SourceNodeKind>(n: SourceNode<T>) => CodePartL)
  | NodeTransformerFactory<any, any>

export interface CodeLine {
  $parts$: CodePartR[]
}

export interface CodeLines {
  $lines$: CodeLine[]
  start: string
  end: string
  separator: string
}

export function isCodeLines(o: any): o is CodeLines {
  return o && (o as any).$lines$
}

export function isCodeLine(o: any): o is CodeLine {
  return o && (o as any).$parts$
}

export interface MethodDecl {
  $method$: {
    args: string[]
    ret: string
    body: null | CodeLines
  }
}

export function isMethodDecl(o: any): o is MethodDecl {
  return o && (o as any).$method$
}

export function codeWriter<CFG extends object>(transforms: Array<GenNodes<CFG>>, info: GenInfo<CFG>): CodeWriter {
  const wSelf: CodeWriter = {
    statements(statements: CodePartL[], block: boolean): CodeLines {
      return wSelf.lines(statements, block ? '{' : '', block ? '}' : '', ';')
    },
    lines(lines: CodePartL[], start: string, end: string, separator: string): CodeLines {
      return { $lines$: flatLines(lines), start, end, separator }
    },
    transform(node) {
      return transformNode(node)
    },
    map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines {
      const lines = nodes.reduce<CodePartR[]>((p, c) => {
        if (isObjectConst(c))
          return c.props.map((p) => transformNode(p.val))
        return (c as any).items.map(transformNode)
      }, [])
      return wSelf.lines(lines, '[', ']', ',')
    },
    mapObj<KIND extends SourceNodeObjectKind, T extends SourceNode<any>>(
      objs: ObjectConst<KIND, T> | Array<ObjectConst<KIND, any>>,
      fn?: (val: T, name: StringConst) => CodePartL,
      filter?: (val: T, name: StringConst) => boolean,
      heading?: CodePartL[]
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
    code(node, opts): MethodDecl {
      const body: CodePartL[] = node.body.map(b => b.getText())
      let retType = node.ret.getText()
      if (opts) {
        if (opts.after) body.push(opts.after)
        if (typeof opts.forceRetType === 'string') retType = opts.forceRetType
      }
      // return wSelf.lines([
      //   ['(', node.params.map(p => p.getText()).join(','), ')', retType ? ':' : '', retType, '=>', body]
      // ], '', '', '')
      wSelf.lines(body, '', '', '')
      return wSelf.methodDecl(
        node.params.map(p => p.getText()),
        retType,
        body
      )
    },
    methodDecl(args: string[], ret: string, statements: null | CodePartL[]): MethodDecl {
      const body = statements && wSelf.statements(statements, true)
      return {
        $method$: {
          args, ret, body
        }
      }
    },
    array(arr: CodePartL[]): CodeLines {
      return wSelf.lines(arr, '[', ']', ',')
    },
    object(obj: { [name: string]: CodePartL | NodeTransformerFactory<any, any> }, node?: SourceNode<any>): CodeLines {
      return wSelf.lines(mapObjectToArray(obj, (val, key) => {
        if (node) {
          const vnode = (isObjectConst(node)) ? node.get(key) : (node as any)[key]
          if (!vnode) throw info.ws.error('propriedade ' + key + ' não existe em ' + node.kind, node)
          if (isNodeTransformerFactory(val)) {
            return () => propv(key, val.make(vnode, info.cfg))
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
    resolveCode(code) {
      return resolveCode(code, transformNode)
    }
  }
  return wSelf

  function propv(key: string | StringConst, v: CodePartL) {
    const sk = isStringConst(key) ? key.str : key
    const k = /^\w+$/.test(sk) ? sk : wSelf.string(sk)
    if (isMethodDecl(v)) return [k, v]
    return [k, ':', v]
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
    if (isCode(n)) return wSelf.code(n)
    if (isArrayConst(n)) return wSelf.map([n])
    if (isObjectConst(n)) return wSelf.map([n])
    throw info.ws.fatal('Gerador não suporta: ' + n.kind +
      ' / ' + transforms.map((t) => Object.keys(t).join()).join('|') +
      ' stack=' + info.stack.items.map(i => (i as any).kind).join(',')
      , n)
  }

  function flatLines(lines: CodePartL[]): CodeLine[] {
    return lines.map(l => ({
      $parts$: flatPartL(l)
    }))
  }

  function flatPartL(p1: CodePartL): CodePartR[] {
    const fres: CodePartR[] = []
    flat(p1)
    return fres
    function flat(p: CodePartL) {
      if (isCodeLines(p)) fres.push(p)
      else if (isMethodDecl(p)) {
        fres.push('(')
        fres.push(p.$method$.args.join(', '))
        fres.push(')')
        if (p.$method$.ret) {
          fres.push(':')
          fres.push(p.$method$.ret)
        }
        if (p.$method$.body)
          fres.push(p.$method$.body)
      }
      // fres.push({
      //   ...p,
      //   $lines$: flatLines(p.$lines$),
      // })
      else if (typeof p === 'string') fres.push(p)
      else if (Array.isArray(p)) return p.forEach(flat)
      else if (isObjectConstProp(p)) flat(p.val)
      else if (isSourceNode(p)) flat(transformNode(p))
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
        c.$lines$.forEach((l, idx) => {
          if (idx === 0 && c.start) writeln()
          const o = txt.length
          incIdent()
          resolveCodePart(l.$parts$)
          decIdent()
          if (c.separator && (!lineIsEmpty) && o < txt.length) write(c.separator)
          writeln()
        })
        if (c.end) write(c.end)
      } else resolveCodePart(c)
    }

    function resolveCodePart(c: CodePartL) {
      if (typeof c === 'string') write(c)
      else if (isCodeLines(c)) resolveCodeLines(c)
      else if (Array.isArray(c)) c.forEach(resolveCodePart)
      else if (isSourceNode(c)) resolveCodePart(resolveNode(c))
      else if (isNodeTransformer(c)) {
        resolveCodePart(c.transform(transforms, info))
      }
      else if (typeof c === 'function') resolveCodePart(c())
      else {
        throw new Error('cant resolveCodePart ' + typeof c)
      }
    }
  }
}