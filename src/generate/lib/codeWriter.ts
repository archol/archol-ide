import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst,
  isArrayConst, isObjectConst, isSourceNode, isStringConst, Code
} from "load/types"
import { mapObjectToArray } from 'utils'
import { quote } from './generator'
import { GenWS } from './wsgen'

export interface CodeWriter {
  add(p: CodeLines | CodePart): void
  statements(lines: CodePart[], block: boolean): CodeLines
  lines(lines: CodePart[], start: string, end: string, separator: string): CodeLines
  transverse(node: SourceNode<any>): CodePart
  map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines
  code(node: Code, opts?: { after?: CodePart, forceRetType?: string }): CodeLines
  array(arr: CodePart[]): CodeLines
  object(obj: { [name: string]: CodePart }): CodeLines
  string(node: StringConst | string): string
  resolveCode(code: CodePart): string
}

export type CodePart = string | string[] | CodeLines | SourceNode<any> | CodePart[] | (() => CodePart)

export interface CodeLines {
  lines: CodePart[]
  start: string
  end: string
  separator: string
}

export function isCodeLines(o: any): o is CodeLines {
  return (o as any).lines
}

export type GenInfo<OPTS> = { ws: GenWS, opts: OPTS }
export type GenNodes<OPTS> = {
  [name in SourceNodeKind]?: GenFunc<name, OPTS>
}

export type GenFunc<name extends SourceNodeKind, OPTS> =
  (writer: CodeWriter, node: SourceNodeType<name>, info: GenInfo<OPTS>) => CodePart


export function codeWriter<OPTS>(transverse: GenNodes<OPTS>, info: GenInfo<OPTS>): CodeWriter {
  const parts: CodePart = []
  const w: CodeWriter = {
    add(p: any): void {
      parts.push(p)
    },
    statements(statements: CodePart[], block: boolean): CodeLines {
      return w.lines(statements, block ? '{' : '', block ? '}' : '', ';')
    },
    lines(lines: CodePart[], start: string, end: string, separator: string): CodeLines {
      return { lines, start, end, separator }
    },
    transverse(node) {
      return exec(node)
    },
    map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines {
      const lines = nodes.reduce<CodePart[]>((p, c) => {
        if (isObjectConst(c))
          return c.props.map((p) => exec(p.val))
        return (c as any).items.map(exec)
      }, [])
      return w.lines(lines, '[', ']', ',')
    },
    code(node, opts): CodeLines {
      const body = w.statements(node.body.map(b => b.getText()), true)
      let retType = node.ret.getText()
      if (opts) {
        if (opts.after) body.lines.push(opts.after)
        if (typeof opts.forceRetType === 'string') retType = opts.forceRetType
      }
      return w.lines([
        ['(', node.params.map(p => p.getText()).join(','), ')', retType ? ':' : '', retType, '=>', body]
      ], '', '', '')
    },
    array(arr: CodePart[]): CodeLines {
      return w.lines(arr, '[', ']', ',')
    },
    object(obj: { [name: string]: CodePart }): CodeLines {
      return w.lines(mapObjectToArray(obj, (val, key) => [w.string(key), ':', val]), '{', '}', ',')
    },
    string(node: StringConst | string | string[]): string {
      if (isStringConst(node)) return quote(node.str)
      if (Array.isArray(node)) return quote(node.join(''))
      return quote(node)
    },
    resolveCode(code) {
      return resolveCode(code, exec)
    }
  }
  return w
  function exec(n: SourceNode<any>): CodePart {
    const w2 = codeWriter(transverse, info)
    const fn = (transverse as any)[n.kind]
    if (!fn) throw info.ws.ws.fatal('Gerador não suporta: ' + n.kind, n)
    return fn(w2, n, info)
  }
}

function resolveCode(code: CodePart, exec: (n: SourceNode<any>) => CodePart): string {
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
    if (typeof c === 'function') resolveCodePart(c())
    else if (isCodeLines(c)) resolveCodeLines(c)
    else if (Array.isArray(c)) c.forEach(resolveCodePart)
    else if (isSourceNode(c)) resolveCodePart(exec(c))
    else if (typeof c === 'string') write(c)
    else {
      debugger
      throw new Error('cant resolveCodePart ' + typeof c)
    }
  }
}