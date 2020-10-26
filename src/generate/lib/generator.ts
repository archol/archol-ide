import ts, { CodeBlockWriter, Project, SourceFile } from 'ts-morph'
import { Application, ArrayConst, isArrayConst, isCode, isObjectConst, isStringConst, ObjectConst, SourceNode, SourceNodeKind, SourceNodeType, SourceRef, StringConst, TsNode, Workspace } from 'load/types'
import { CodePartL, CodeWriter, codeWriter } from './codeWriter'
import { join } from 'path'
import { mapObject, mapObjectToArray, mergeObjWith } from 'utils'

export interface ProjectTransformer<CFG extends object, PT extends GenNodes<CFG>> {
  projectPath: string,
  transformations: PT
  cfg: CFG
  sources: Array<SourceTransformer<any, any>>
}

export function projectTransformer<CFG extends object, ST extends GenNodes<CFG>>(
  info: ProjectTransformer<CFG, ST>) {
  return info
}

export type SourceTransformer<CFG extends object, ST extends GenNodes<CFG>> = 
SourceTransformerOne<CFG,ST> | SourceTransformerMany<CFG,ST>

export interface SourceTransformerOne<CFG extends object, ST extends GenNodes<CFG>>  {
  filePath: string,
  transformations: ST
  cfg: CFG
} 

export interface SourceTransformerMany<CFG extends object, ST extends GenNodes<CFG>>  {
  multiple: true
  transformations: ST
  cfg: CFG
}

export function sourceTransformer<CFG extends object, ST extends GenNodes<CFG>>(
  info: SourceTransformer<CFG, ST>) {
  return info
}

export interface NodeTransformerFactory<CFG extends object, NT extends GenNodes<CFG>> {
  transformerFactory: CFG & NT
  make(node: SourceNode<any>, cfg: CFG): NodeTransformer<CFG, NT>
}

export interface NodeTransformer<CFG extends object, NT extends GenNodes<CFG>> {
  transformations: CFG & NT
  transformNode: SourceNode<any>
  transform(parent: Array<GenNodes<CFG>>, info: GenInfo<CFG>): CodePartL
}

export function nodeTransformer<CFG extends object, NT extends GenNodes<CFG>>(
  transforms: NT, cfginit: CFG): NodeTransformerFactory<CFG, NT> {
  const r1: NodeTransformerFactory<CFG, NT> = {
    transformerFactory: true as any as CFG & NT,
    make(node: SourceNode<any>, cfg: CFG): NodeTransformer<CFG, NT> {
      const r2: NodeTransformer<CFG, NT> = {
        transformations: transforms as any as CFG & NT,
        transformNode: node,
        transform(parent: Array<GenNodes<CFG>>, info: GenInfo<CFG>): CodePartL {
          const w2 = codeWriter([transforms, ...parent], { ...info, cfg: { ...info.cfg, ...cfg } })
          return w2.transform(node)
        }
      }
      return r2
    }
  }
  return r1
}

export function isNodeTransformerFactory(obj: any): obj is NodeTransformerFactory<any, any> {
  return (obj as any).transformerFactory
}

export function isNodeTransformer(obj: any): obj is NodeTransformer<any, any> {
  return (obj as any).transformNode
}

export type GenNodes<CFG extends object> = {
  [name in SourceNodeKind]?: GenFunc<name, CFG>
}

export interface GenInfo<CFG extends object> {
  ws: Workspace
  prj: {}
  src: {
    require(identifier: string, module: string, sourceRef: TsNode): void
    requireDefault(identifier: string, module: string, sourceRef: TsNode): void
    chip<CFG2 extends object>(id: string, sourceRef: TsNode, nt: () => NodeTransformer<CFG2, any>): string
  }
  node: {

  },
  stack: GenFuncStack
  cfg: CFG  
  transformFile<CFG extends object, ST extends GenNodes<CFG>>(
    filePath: string,
    transformations: NodeTransformer<CFG, ST>        
    ): void  
}

export type GenFunc<name extends SourceNodeKind, CFG extends object> =
  (writer: CodeWriter, node: SourceNodeType<name>, info: GenInfo<CFG>) => CodePartL


export interface GenFuncStack {
  items: Array<SourceNodeType<any>>
  get<KIND extends SourceNodeKind>(kind: KIND, n?: number): SourceNodeType<KIND>
}

export interface generateApplication<CFG extends object, SW extends GenNodes<CFG>> {
  ws: Workspace,
  app: Application,
  cfg: CFG,
  wstransformations: SW,
  projects: Array<ProjectTransformer<any, any>>,
}

export async function generateApplication<CFG extends object, SW extends GenNodes<CFG>>(
  { ws, app, wstransformations, projects, cfg }: generateApplication<CFG, SW>): Promise<void> {
  const prjs: { [name: string]: Project } = {}
  const srcs: { [name: string]: boolean } = {}
  projects.forEach((prj) => {
    prj.sources.forEach((src) => transformFileDecl(prj, src))
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
    const src = prj.getSourceFile(fn) || prj.createSourceFile(fn, undefined, {overwrite: true})
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

  function isSourceTransformerOne<CFG extends object, ST extends GenNodes<CFG>>(o: SourceTransformer<CFG, ST>): o is SourceTransformerOne<CFG,ST> {
    return (o as any).filePath
  }

  function transformFileDecl<CFG extends object, ST extends GenNodes<CFG>>(
    prj: ProjectTransformer<any, any>, src: SourceTransformer<any, any>) {
    if (isSourceTransformerOne(src)) 
    return genereateFile(prj, src.filePath, src.transformations, app)
    
    const wnll = codeWriter([src.transformations], {
      ws,
      prj: {},
      src: { requireDefault: deny, require:deny, chip:deny},
      node: {},
      stack: createStack(),
      transformFile: transformFileInt,
      cfg
    })
    let codenull = wnll.transform(app)
    const srcnull=wnll.resolveCode(codenull)
    if (srcnull)    ws.fatal('multiple files cant return code', ws.sourceRef)

    function deny(): any {
      ws.fatal('transform multiple sources dont support that', ws.sourceRef)
    }

    function transformFileInt<CFGsub extends object, STsub extends GenNodes<CFGsub>>(
      subfilePath: string,
      subtransformations: NodeTransformer<CFGsub, STsub>        
      ): void  {
        genereateFile<CFGsub, STsub>(prj, subfilePath, subtransformations.transformations, subtransformations.transformNode)
      }    
  

  function genereateFile<CFG extends object, ST extends GenNodes<CFG>>(
    prj: ProjectTransformer<any, any>, 
    filePath: string, 
    srctransformations: ST,
    startNode: SourceNode<any>
    ): void {
    const srcUsed: { [id: string]: TsNode } = {}
    let srcIdentifiers: {
      [id: string]: {
        transform(): NodeTransformer<any, any>
      }
    } = {}
    const srcRequires: {
      [module: string]: {
        def?: string
        ids: string[]
      }
    } = {}

    const srcfile = openSourceFile(prj.projectPath, filePath)
    const w = codeWriter([srctransformations, prj.transformations, wstransformations], {
      ws,
      prj: {},
      src: { requireDefault, require, chip },
      node: {},
      stack: createStack(),
      transformFile: transformFileInt,
      cfg
    })
    let rest = w.transform(startNode)

    while (Object.keys(srcIdentifiers).length) {
      const srcids = srcIdentifiers
      srcIdentifiers = {}
      mapObjectToArray(srcids, (val, key) => {
        rest = rest.concat(w.statements([val.transform()], false))
      })
    }

    const res = w.resolveCode(rest)
    mapObjectToArray(srcRequires, (val, key) => {
      const preq: string[] = [];
      if (val.def) preq.push(val.def)
      if (val.ids.length) preq.push('{ ' + val.ids.join(', ') + ' }')
      srcfile.addStatements('import ' + preq.join(', ') + ' from "' + key + '"')
    })

    srcfile.addStatements(res)
    function initReq() {
      return {
        ids: []
      }
    }
    function useId(id: string, sourceRef: TsNode) {
      // if (srcUsed[id]) throw ws.fatal(id + ' identificar duplicado', [srcUsed[id], sourceRef])
      srcUsed[id] = sourceRef
    }
    function require(id: string, module: string, sourceRef: TsNode): void {
      useId(id, sourceRef)
      const req = srcRequires[module] || (srcRequires[module] = initReq())
      if (!req.ids.includes(id)) req.ids.push(id)
    }
    function requireDefault(id: string, module: string, sourceRef: TsNode): void {
      useId(id, sourceRef)
      const req = srcRequires[module] || (srcRequires[module] = initReq())
      req.def = id
    }
    function chip<CFG2 extends object>(id: string, sourceRef: TsNode, nt: () => NodeTransformer<CFG2, any>): string {
      useId(id, sourceRef)
      srcIdentifiers[id] = {
        transform: nt
      }
      return id
    }
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
