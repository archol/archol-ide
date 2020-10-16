import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst,
  isArrayConst, isObjectConst, isSourceNode, isStringConst
} from "load/types"
import { mapObjectToArray } from 'utils'
import { quote } from './generator'
import { GenWS } from './wsgen'

export interface CodeWriter {
  add(p: CodeLines | CodePart): void
  lines(lines: CodePart[], braces: Braces): CodeLines
  transverse(node: SourceNode<any>): CodePart
  resolve(code: CodePart): string
  map(node: ObjectConst | ArrayConst): CodeLines
  array(arr: CodePart[]): CodeLines
  object(obj: { [name: string]: CodePart }): CodeLines
  string(node: StringConst | string): string
}

export type CodePart = string | string[] | CodeLines | SourceNode<any> | CodePart[] | (() => CodePart)

export interface CodeLines {
  lines: CodePart[]
  braces: Braces
}
type Braces = 'no' | '[]' | '{}'

export function isCodeLines(o: any): o is CodeLines {
  return (o as any).lines && (o as any).braces
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
      parts.push(resolveCode(p))
    },
    lines(lines: CodePart[], braces: Braces): CodeLines {
      return { lines, braces }
    },
    transverse(node) {
      return exec(node)
    },
    resolve: resolveCode,
    map(node: ObjectConst | ArrayConst): CodeLines {
      if (isObjectConst(node))
        return w.lines(node.props.map((p) => exec(p.val)), '{}')
      if (isArrayConst(node))
        return w.lines(node.items.map(exec), '[]')
      throw info.ws.ws.fatal('map só funciona em ObjectConst | ArrayConst', node)
    },
    array(arr: CodePart[]): CodeLines {
      return w.lines(arr, '[]')
    },
    object(obj: { [name: string]: CodePart }): CodeLines {
      return w.lines(mapObjectToArray(obj, (val, key) => [w.string(key), ':', val]), '{}')
    },
    string(node: StringConst | string | string[]): string {
      if (isStringConst(node)) return quote(node.str)
      if (Array.isArray(node)) return quote(node.join(''))
      return quote(node)
    },
  }
  return w
  function resolveCode(c: CodePart): string {
    if (typeof c === 'function') return resolveCode(c())
    else if (isCodeLines(c)) return resolveCode([
      c.braces === 'no' ? '' : c.braces[0],
      c.lines.map((i) => resolveCode(['\n', i])),
      c.braces === 'no' ? '' : '\n' + c.braces[1] + '\n'])
    else if (Array.isArray(c)) {
      const r = (c as any).map((i: any) => {
        return resolveCode(i)
      })
      return r.join('')
    }
    else if (isSourceNode(c)) return resolveCode(exec(c))
    return c
  }
  function exec(n: SourceNode<any>): CodePart {
    const w2 = codeWriter(transverse, info)
    const fn = (transverse as any)[n.kind]
    if (!fn) throw info.ws.ws.fatal('Gerador não suporta: ' + n.kind, n)
    const r = fn(w2, n, info)
    return resolveCode(r)
  }
}