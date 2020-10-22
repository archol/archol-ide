import ts, { CodeBlockWriter, Project, SourceFile } from 'ts-morph'
import { Application, ArrayConst, isArrayConst, isCode, isObjectConst, isStringConst, ObjectConst, SourceNode, SourceNodeKind, SourceNodeType, SourceRef, StringConst, TsNode, Workspace } from 'load/types'
import { CodePartL, CodeWriter, codeWriter } from './codeWriter'
import { join } from 'path'
import { mapObject, mapObjectToArray, mergeObjWith } from 'utils'

export interface ProjectTransformer<PT extends GenNodes> {
  projectPath: string,
  transformations: PT
  sources: Array<SourceTransformer<any>>
}

export function projectTransformer<ST extends GenNodes>(
  info: ProjectTransformer<ST>) {
  return info
}

export interface SourceTransformer<ST extends GenNodes> {
  filePath: string,
  transformations: ST
}

export function sourceTransformer<ST extends GenNodes>(
  info: SourceTransformer<ST>) {
  return info
}

export type NodeTransformerFactory<NT extends GenNodes> = (
  (node: SourceNode<any>) => NodeTransformer<NT>
) & {
  transformerFactory: true
}

export interface NodeTransformer<NT extends GenNodes> {
  transformNode: true
  transform(parent: GenNodes[], info: GenInfo): CodePartL
}

export function nodeTransformer<NT extends GenNodes>(transforms: NT): NodeTransformerFactory<NT> {
  return mergeObjWith(
    (node: SourceNode<any>) => {
      const r: NodeTransformer<NT> = {
        transformNode: true,
        transform(parent: GenNodes[], info: GenInfo): CodePartL {
          const w2 = codeWriter([transforms, ...parent], info)
          return w2.transform(node)
        }
      }
      return r
    },
    { transformerFactory: true as true }
  )
}

export function isNodeTransformerFactory(obj: any): obj is NodeTransformerFactory<any> {
  return (obj as any).transformerFactory
}

export function isNodeTransformer(obj: any): obj is NodeTransformer<any> {
  return (obj as any).transformNode
}

export type GenNodes = {
  [name in SourceNodeKind]?: GenFunc<name>
}

export interface GenInfo {
  ws: Workspace
  prj: {}
  src: {
    require(identifier: string, module: string, sourceRef: TsNode): void
  }
  node: {

  },
  stack: GenFuncStack
}

export type GenFunc<name extends SourceNodeKind> =
  (writer: CodeWriter, node: SourceNodeType<name>, info: GenInfo) => CodePartL


export interface GenFuncStack {
  items: Array<SourceNodeType<any>>
  get<KIND extends SourceNodeKind>(kind: KIND, n?: number): SourceNodeType<KIND>
}

export async function generateApplication<SW extends GenNodes>(
  { ws, app, transformations, projects }:
    {
      ws: Workspace,
      app: Application,
      transformations: SW,
      projects: Array<ProjectTransformer<any>>
    }): Promise<void> {
  const prjs: { [name: string]: Project } = {}
  const srcs: { [name: string]: boolean } = {}
  projects.forEach((prj) => {
    prj.sources.forEach((src) => transformFile(prj, src))
  })
  return saveAll()

  function openProject(projectPath: string) {
    const pn = join(ws.path, projectPath)
    const p = prjs[pn] || (prjs[pn] = new Project({
      tsConfigFilePath: join(pn, 'tsconfig.json')
    }))
    return p
  }
  function openSourceFile(projectPath: string, filePath: string) {
    const fn = join(ws.path, projectPath, 'src', filePath)
    const prj = openProject(projectPath)
    const src = prj.getSourceFile(fn) || prj.createSourceFile(fn)
    if (!srcs[fn]) {
      src.removeText()
      srcs[fn] = true
    }
    return src
  }
  async function saveAll() {
    await Promise.all(mapObjectToArray(prjs, (p) => {
      p.getSourceFiles().forEach(src => src.formatText({
        indentSize: 2
      }))
      return p.save()
    }))
  }
  function transformFile(prj: ProjectTransformer<any>, src: SourceTransformer<any>) {
    const srcImportDefs: {
      [id: string]: string
    } = {}
    const srcfile = openSourceFile(prj.projectPath, src.filePath)
    const w = codeWriter([src.transformations, prj.transformations, transformations], {
      ws,
      prj: {},
      src: { require: importDefault },
      node: {},
      stack: createStack()
    })
    const rest = w.transform(app)
    const res = w.resolveCode(rest)
    mapObjectToArray(srcImportDefs, (val) => {
      srcfile.addStatements(val)
    })
    srcfile.addStatements(res)
    function importDefault(id: string, module: string, sourceRef: TsNode): void {
      if (srcImportDefs[id]) {
        if (srcImportDefs[id] !== module)
          throw ws.fatal('import ' + id + ' usando em ' + srcImportDefs[id] + ' ' + module, sourceRef)
      }
      srcImportDefs[id] = module
    }
  }
  function createStack(): GenFuncStack {
    const items: Array<SourceNode<any>> = []
    return {
      items,
      get(kind, idx) {
        let ocor = 0
        const last = items.length - 1
        idx = idx || 0
        for (let i = last; i >= 0; i--) {
          const item = items[i]
          if (item.kind === kind) {
            if (ocor >= idx) return item as any
            ocor++
          }
        }
        throw ws.fatal('stack não tem ' + kind, items[last])
      }
    }
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
