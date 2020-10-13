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
    end: { pos: 0, row: 0 },
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
    warn(errId: string, tsNode: TsNode | null, errMsg?: string): void {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: tsNode && ws.getRef(tsNode),
        kind: 'warn'
      }
    },
    error(errId: string, tsNode: TsNode | null, errMsg?: string): void {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: tsNode && ws.getRef(tsNode),
        kind: 'error'
      }
    },
    fatal(errId: string, tsNode: TsNode | null, errMsg?: string): Error {
      ws.diagnostics[errId] = {
        msg: errMsg || errId,
        sourceRef: tsNode && ws.getRef(tsNode),
        kind: 'fatal'
      }
      return new Error(errMsg || errId)
    },
    getRef(tsNode: any): SourceRef {
      if (Object.keys(tsNode).sort().join(',') === 'end,file,start') return tsNode
      if (tsNode.sourceRef && Object.keys(tsNode.sourceRef).sort().join(',') === 'end,file,start') return tsNode.sourceRef
      if (tsNode instanceof Node) return {
        file: tsNode.getSourceFile().getFilePath(),
        start: {
          pos: tsNode.getStart(),
          row: tsNode.getStartLineNumber(),
          col: tsNode.getStartLinePos(),
        },
        end: {
          pos: tsNode.getEnd(),
          row: tsNode.getEndLineNumber(),
        },
      }
      if (tsNode instanceof SourceFile) return {
        file: tsNode.getFilePath(),
        start: {
          pos: tsNode.getStart(),
          row: tsNode.getStartLineNumber(),
          col: tsNode.getStartLinePos(),
        },
        end: {
          pos: tsNode.getEnd(),
          row: tsNode.getEndLineNumber(),
        },
      }
      throw new Error('invalid source node')
    }
  }
  return ws
}
