import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst,
  isObjectConst, isSourceNode, isStringConst, Code, isCode, isArrayConst, SourceNodeObjectKind, Workspace
} from "load/types"
import { mapObjectToArray } from 'utils'
import { quote, NodeTransformer, isNodeTransformer, NodeTransformerFactory, isNodeTransformerFactory } from './generator'

export interface CodeWriter {
  add(p: CodeLines | CodePart): void
  statements(lines: CodePart[], block: boolean): CodeLines
  lines(lines: CodePart[], start: string, end: string, separator: string): CodeLines
  transverse(node: SourceNode<any>): CodePart
  map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines
  mapObj<kind extends SourceNodeObjectKind>(
    obj: ObjectConst<kind>,
    fn?: (val: SourceNodeType<kind>, name: StringConst) => CodePart): CodeLines
  code(node: Code, opts?: { after?: CodePart, forceRetType?: string }): CodeLines
  array(arr: CodePart[]): CodeLines
  object(obj: { [name: string]: CodePart }): CodeLines
  object(obj: { [name: string]: CodePart | NodeTransformerFactory<any> }, objNode: SourceNode<any>): CodeLines
  string(node: StringConst | string): string
  resolveCode(code: CodePart): string
}

export type CodePart = string | string[] | CodeLines | SourceNode<any> | CodePart[] | (() => CodePart) | NodeTransformer<any>

export interface CodeLines {
  lines: CodePart[]
  start: string
  end: string
  separator: string
}

export function isCodeLines(o: any): o is CodeLines {
  return (o as any).lines
}

export type GenNodes = {
  [name in SourceNodeKind]?: GenFunc<name>
}

export interface GenInfo {
  ws: Workspace
}

export type GenFunc<name extends SourceNodeKind> =
  (writer: CodeWriter, node: SourceNodeType<name>, info: GenInfo) => CodePart

export function codeWriter(transforms: GenNodes[], info: GenInfo): CodeWriter {
  const parts: CodePart = []
  const wSelf: CodeWriter = {
    add(p: any): void {
      parts.push(p)
    },
    statements(statements: CodePart[], block: boolean): CodeLines {
      return wSelf.lines(statements, block ? '{' : '', block ? '}' : '', ';')
    },
    lines(lines: CodePart[], start: string, end: string, separator: string): CodeLines {
      return { lines, start, end, separator }
    },
    transverse(node) {
      return transformNode(node)
    },
    map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines {
      const lines = nodes.reduce<CodePart[]>((p, c) => {
        if (isObjectConst(c))
          return c.props.map((p) => transformNode(p.val))
        return (c as any).items.map(transformNode)
      }, [])
      return wSelf.lines(lines, '[', ']', ',')
    },
    mapObj<kind extends SourceNodeObjectKind>(
      obj: ObjectConst<kind>,
      fn?: (val: SourceNodeType<kind>, name: StringConst) => CodePart): CodeLines {
      return wSelf.lines(obj.props.map((i) => [wSelf.string(i.key), ':', (fn || transformNode)(i.val as any, i.key)]), '{', '}', ',')
    },
    code(node, opts): CodeLines {
      const body = wSelf.statements(node.body.map(b => b.getText()), true)
      let retType = node.ret.getText()
      if (opts) {
        if (opts.after) body.lines.push(opts.after)
        if (typeof opts.forceRetType === 'string') retType = opts.forceRetType
      }
      return wSelf.lines([
        ['(', node.params.map(p => p.getText()).join(','), ')', retType ? ':' : '', retType, '=>', body]
      ], '', '', '')
    },
    array(arr: CodePart[]): CodeLines {
      return wSelf.lines(arr, '[', ']', ',')
    },
    object(obj: { [name: string]: CodePart | NodeTransformerFactory<any> }, node?: SourceNode<any>): CodeLines {
      return wSelf.lines(mapObjectToArray(obj, (val, key) => {
        if (isNodeTransformerFactory(val)) {
          if (node) {
            const vnode = (isObjectConst(node)) ? node.get(key) : (node as any)[key]
            return () => [wSelf.string(key), ':', val(vnode)]
          }
          throw info.ws.fatal('object com TransformerFactory precisa de Node', info.ws.sourceRef)
        } else
          return [wSelf.string(key), ':', val]
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

  function transformNode(n: SourceNode<any>): CodePart {
    const w2 = codeWriter(transforms, info)
    for (const t of transforms) {
      const fn: GenFunc<any> = (t as any)[n.kind]
      if (fn) return fn(w2, n, info)
    }
    return defaultTransformer(n)
  }
  function defaultTransformer(n: SourceNode<any>) {
    if (isStringConst(n)) return wSelf.string(n)
    if (isCode(n)) return wSelf.code(n)
    if (isArrayConst(n)) return wSelf.map([n])
    if (isObjectConst(n)) return wSelf.map([n])
    throw info.ws.fatal('Gerador não suporta: ' + n.kind, n)
  }

  function resolveCode(code: CodePart, resolveNode: (n: SourceNode<any>) => CodePart,): string {
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
    function resolveCodeLines(c: CodePart) {
      if (isCodeLines(c)) {
        write(c.start)
        c.lines.forEach((l, idx) => {
          if (idx === 0 && c.start) writeln()
          const o = txt.length
          incIdent()
          resolveCodePart(l)
          decIdent()
          if (c.separator && o < txt.length) write(c.separator)
          writeln()
        })
        if (c.end) write(c.end)
      } else resolveCodePart(c)
    }

    function resolveCodePart(c: CodePart) {
      if (typeof c === 'string') write(c)
      else if (isCodeLines(c)) resolveCodeLines(c)
      else if (Array.isArray(c)) c.forEach(resolveCodePart)
      else if (isSourceNode(c)) resolveCodePart(resolveNode(c))
      else if (isNodeTransformer(c)) {
        resolveCodePart(c.transform(transforms, info))
      }
      else if (typeof c === 'function') resolveCodePart(c())
      else {
        debugger
        throw new Error('cant resolveCodePart ' + typeof c)
      }
    }
  }
}