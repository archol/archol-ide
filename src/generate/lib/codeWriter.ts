import {
  ArrayConst, ObjectConst,
  SourceNode, SourceNodeKind, SourceNodeType, StringConst,
  isObjectConst, isSourceNode, isStringConst, Code, isCode, isArrayConst, SourceNodeObjectKind, Workspace
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
  mapObj<kind extends SourceNodeObjectKind>(
    obj: ObjectConst<kind>,
    fn?: (val: SourceNodeType<kind>, name: StringConst) => CodePartL,
    filter?: (val: SourceNodeType<kind>, name: StringConst) => boolean,
  ): CodeLines
  code(node: Code, opts?: { after?: CodePartL[], forceRetType?: string }): CodeLines
  array(arr: CodePartL[]): CodeLines
  object(obj: { [name: string]: CodePartL }): CodeLines
  object(obj: { [name: string]: CodePartL | NodeTransformerFactory<any> }, objNode: SourceNode<any>): CodeLines
  string(node: StringConst | string): string
  resolveCode(code: CodePartR[]): string
}

export type CodePartR = string | string[] | CodeLines
export type CodePartL = string | string[] | CodeLines | SourceNode<any> | CodePartL[] | (() => CodePartL) | NodeTransformer<any>

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

export function codeWriter(transforms: GenNodes[], info: GenInfo): CodeWriter {
  const wSelf: CodeWriter = {
    statements(statements: CodePartL[], block: boolean): CodeLines {
      return wSelf.lines(statements, block ? '{' : '', block ? '}' : '', ';')
    },
    lines(lines: CodePartL[], start: string, end: string, separator: string): CodeLines {
      // console.log(JSON.stringify({ antes: resolveCode(lines as any, transformNode), depis: resolveCode(mapPart(lines), transformNode) }))
      // console.log(JSON.stringify({ $lines$: lines, depis: mapPartL2R(lines) }))
      return { $lines$: flatLines(lines), start, end, separator }
    },
    transform(node) {
      return flatPartL(transformNode(node))
    },
    map(nodes: Array<ObjectConst<any> | ArrayConst<any>>): CodeLines {
      const lines = nodes.reduce<CodePartR[]>((p, c) => {
        if (isObjectConst(c))
          return c.props.map((p) => transformNode(p.val))
        return (c as any).items.map(transformNode)
      }, [])
      return wSelf.lines(lines, '[', ']', ',')
    },
    mapObj<kind extends SourceNodeObjectKind>(
      obj: ObjectConst<kind>,
      fn?: (val: SourceNodeType<kind>, name: StringConst) => CodePartL,
      filter?: (val: SourceNodeType<kind>, name: StringConst) => boolean
    ): CodeLines {
      return wSelf.lines(obj.props
        .filter((i) => filter ? filter(i.val as any, i.key) : true)
        .map((i) => [
          [wSelf.string(i.key), ':', (fn || transformNode)(i.val as any, i.key)]
        ]), '{', '}', ',')
    },
    code(node, opts): CodeLines {
      const body = wSelf.statements(node.body.map(b => b.getText()), true)
      let retType = node.ret.getText()
      if (opts) {
        if (opts.after) body.$lines$.push(...(flatLines(opts.after)))
        if (typeof opts.forceRetType === 'string') retType = opts.forceRetType
      }
      return wSelf.lines([
        ['(', node.params.map(p => p.getText()).join(','), ')', retType ? ':' : '', retType, '=>', body]
      ], '', '', '')
    },
    array(arr: CodePartL[]): CodeLines {
      return wSelf.lines(arr, '[', ']', ',')
    },
    object(obj: { [name: string]: CodePartL | NodeTransformerFactory<any> }, node?: SourceNode<any>): CodeLines {
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

  function transformNode(n: SourceNode<any>): CodePartL {
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
    throw info.ws.fatal('Gerador não suporta: ' + n.kind + ' / ' + transforms.map((t) => Object.keys(t).join()).join('|'), n)
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
      // fres.push({
      //   ...p,
      //   $lines$: flatLines(p.$lines$),
      // })
      else if (typeof p === 'string') fres.push(p)
      else if (Array.isArray(p)) return p.forEach(flat)
      else if (isSourceNode(p)) flat(transformNode(p))
      else if (isNodeTransformer(p)) {
        flat(p.transform(transforms, info))
      }
      else if (typeof p === 'function') flat(p())
      else {
        debugger
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
          if (c.separator && o < txt.length) write(c.separator)
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
        debugger
        throw new Error('cant resolveCodePart ' + typeof c)
      }
    }
  }
}