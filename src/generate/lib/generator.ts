import ts, { CodeBlockWriter } from 'ts-morph'
import { ArrayConst, ObjectConst, SourceNode, SourceNodeKind, SourceNodeType, StringConst, Workspace } from 'load/types'
import { GenWS } from './wsgen'
import { codeWriter, GenFunc, GenNodes } from './codeWriter'

export function generator<S extends GenNodes<OPTS>, OPTS extends object = {}>(cfg:
  {
    transverse: S,
    opts?: OPTS,
  }
): (n: SourceNode<any>, ws: GenWS) => string
export function generator<S extends GenNodes<OPTS>, OPTS extends object = {}>(cfg:
  {
    transverse: S,
    opts?: OPTS,
    project: string,
    file: string,
  }
): (n: SourceNode<any>, ws: GenWS) => string
export function generator<S extends GenNodes<OPTS>, OPTS extends object = {}>(
  { transverse, opts, project, file }:
    {
      transverse: S,
      opts?: OPTS,
      project?: string,
      file?: string,
    }
): any {
  defTransverse()
  return generate
  function generate(n: SourceNode<any>, ws: GenWS): void | string {
    const w1 = codeWriter(transverse, { ws, opts: opts as any })
    const res = w1.resolve(w1.transverse(n))
    if (project && file) {
      const src = ws.getSourceFile(project, file)
      src.addStatements(res)
    }
    else return res
  }
  function defTransverse() {
    if (!transverse.StringConst) transverse.StringConst = (w, n) => w.string(n)
    if (!transverse.Code) transverse.Code = (w, n) => [
      '(', n.params.map(p => p.getText()), '):', n.ret.getText(), '{',
      n.body.map(b => b.getText()),
      '}'
    ]
  }
}

export function typePipeStr(s: string[]) {
  return s.length ? s.map(quote).join('|') : quote('')
}

export function typePipeObj(s: string[]) {
  return s.length ? s.join('|') : '{}'
}

export function quote(s: string) {
  return '"' + s + '"'
}
