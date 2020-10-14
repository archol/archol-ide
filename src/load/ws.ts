import { Node, Project, SourceFile } from 'ts-morph'
import { loadApp } from './app'
import { SourceRef, TsNode, Workspace } from './types'

export async function loadWorkspace(path: string): Promise<Workspace> {
  const ts = new Project({
    tsConfigFilePath: path + '/ws/tsconfig.json'
  })
  const wsRef: SourceRef = {
    file: path + '/ws/tsconfig.json',
    start: { pos: 0, row: 0, col: 0 },
    end: { pos: 0, row: 0, col: 0 },
  }
  const ws: Workspace = {
    kind: "Workspace",
    sourceRef: wsRef,
    defaultLang: {
      kind: 'StringConst',
      sourceRef: wsRef,
      str: 'pt_BR'
    },
    path: path,
    ts,
    apps: ts.getSourceFiles()
      .filter((s) => s.getBaseName().endsWith('.app.ts'))
      .map((s) => s.getBaseName().replace(/\.app\.ts$/g, '')),
    loadApp(appName: string) {
      return loadApp(ws, appName)
    },
    diagnostics: {},
    warn(errId: string, tsNode: TsNode, errMsg?: string): void {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: ws.getRef(tsNode) || wsRef,
        kind: 'warn',
        archol: new Error(errMsg || errId)
      }
    },
    error(errId: string, tsNode: TsNode, errMsg?: string): void {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: ws.getRef(tsNode) || wsRef,
        kind: 'error',
        archol: new Error(errMsg || errId)
      }
    },
    fatal(errId: string, tsNode: TsNode, errMsg?: string): Error {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: ws.getRef(tsNode),
        kind: 'fatal',
        archol: new Error(errMsg || errId)
      }
      return new Error(errMsg || errId)
    },
    getRef(tsNode: any): SourceRef {
      if (tsNode.file && tsNode.start && tsNode.end) return tsNode as any
      if (tsNode.kind && tsNode.sourceRef) return tsNode.sourceRef
      if (tsNode instanceof Node) {
        const start = tsNode.getSourceFile().getLineAndColumnAtPos(tsNode.getStart())
        const end = tsNode.getSourceFile().getLineAndColumnAtPos(tsNode.getEnd())
        return {
          file: tsNode.getSourceFile().getFilePath(),
          start: {
            pos: tsNode.getStart(),
            row: start.line,
            col: start.column,
          },
          end: {
            pos: tsNode.getEnd(),
            row: end.line,
            col: end.column,
          },
        }
      }
      if (tsNode instanceof SourceFile) {
        const start = tsNode.getLineAndColumnAtPos(tsNode.getStart())
        const end = tsNode.getLineAndColumnAtPos(tsNode.getEnd())
        return {
          file: tsNode.getFilePath(),
          start: {
            pos: tsNode.getStart(),
            row: start.line,
            col: start.column,
          },
          end: {
            pos: tsNode.getEnd(),
            row: end.line,
            col: end.column,
          },
        }
      }
      throw new Error('invalid source node')
    }
  }
  return ws
}
