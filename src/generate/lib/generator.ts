import ts, { CodeBlockWriter, Project, SourceFile } from 'ts-morph'
import { Application, ArrayConst, isArrayConst, isCodeNode, isObjectConst, isStringConst, ObjectConst, SourceNode, SourceNodeKind, SourceNodeType, SourceRef, StringConst, TsNode, Workspace } from 'load/types'
import { ChipDecl1 as ChipForNodeTransformerFactory, ChipDecl2 as ChipForNodeTransformer, ChipRes, CodePartL, CodePartLines, CodePartR, CodeWriter, codeWriter, isChipRes } from './codeWriter'
import { join, resolve, dirname } from 'path'
import { mapObject, mapObjectToArray, mergeObjWith, tildeExpand } from 'utils'

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
  SourceTransformerOne<CFG, ST> | SourceTransformerMany<CFG, ST>

export interface SourceTransformerOne<CFG extends object, ST extends GenNodes<CFG>> {
  filePath: string,
  transformations: ST
  cfg: CFG
}

export interface SourceTransformerMany<CFG extends object, ST extends GenNodes<CFG>> {
  multiple: true
  transformations: ST
  cfg: CFG
}

export function sourceTransformer<CFG extends object, ST extends GenNodes<CFG>>(
  info: SourceTransformer<CFG, ST>) {
  return info
}

export interface NodeTransformerFactory<CFG extends object, NT extends GenNodes<CFG>> {
  transformerFactory: NT
  make(node: SourceNode<any>, cfg: CFG): NodeTransformer<CFG, NT>
}

export interface NodeTransformer<CFG extends object, NT extends GenNodes<CFG>> {
  transformations: NT
  transformNode: SourceNode<any>
  transformCFG: CFG
  transform(parent: Array<GenNodes<CFG>>, info: GenInfo<CFG>): CodePartL
}

export function nodeTransformer<CFG extends object, NT extends GenNodes<CFG>>(
  transforms: NT, cfginit: CFG): NodeTransformerFactory<CFG, NT> {
  const r1: NodeTransformerFactory<CFG, NT> = {
    transformerFactory: transforms as any as CFG & NT,
    make(node: SourceNode<any>, cfg: CFG): NodeTransformer<CFG, NT> {
      const r2: NodeTransformer<CFG, NT> = {
        transformations: transforms as any as CFG & NT,
        transformNode: node,
        transformCFG: cfg,
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
  return obj && (obj as any).transformerFactory
}

export function isNodeTransformer(obj: any): obj is NodeTransformer<any, any> {
  return obj && (obj as any).transformNode
}

export type GenNodes<CFG extends object> = {
  [name in SourceNodeKind]?: GenFunc<name, CFG>
}

export interface GenSource {
  require(identifier: string, module: string, sourceRef: TsNode): string
  requireDefault(identifier: string, module: string, sourceRef: TsNode): string
  // chip<CFG2 extends object>(pos: number, nt: () => NodeTransformerFactory<CFG2, any>): ChipForNodeTransformerFactory<CFG2>
  chip<CFG2 extends object>(pos: number, nt: NodeTransformer<CFG2, any>): ChipRes
  chip(pos: number, lines: CodePartLines, block: boolean): void
}

export interface GenInfo<CFG extends object> {
  ws: Workspace
  prj: {}
  src: GenSource
  node: {

  },
  stack: GenFuncStack
  cfg: CFG
  transformFile<CFG extends object, ST extends GenNodes<CFG>>(
    filePath: string,
    transformations: NodeTransformer<CFG, ST>
  ): void
  fileIsEmpty(file: string): boolean
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

let genid = 0

export async function generateApplication<CFG extends object, SW extends GenNodes<CFG>>(
  { ws, app, wstransformations, projects, cfg }: generateApplication<CFG, SW>): Promise<void> {
  const prjs: { [name: string]: Project } = {}
  const srcs: { [name: string]: boolean } = {}
  const stack = createStack()
  projects.forEach((prj) => {
    prj.sources.forEach((src) => transformFileDecl(prj, src, stack))
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
    const src = prj.getSourceFile(fn) || prj.createSourceFile(fn, undefined, { overwrite: true })
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

  function isSourceTransformerOne<CFG extends object, ST extends GenNodes<CFG>>(o: SourceTransformer<CFG, ST>): o is SourceTransformerOne<CFG, ST> {
    return o && (o as any).filePath
  }

  function transformFileDecl<CFG extends object, ST extends GenNodes<CFG>>(
    prj: ProjectTransformer<any, any>,
    src: SourceTransformer<any, any>,
    stack: GenFuncStack) {
    if (isSourceTransformerOne(src))
      return genereateFile(prj, src.filePath, src.transformations, app, cfg, stack)

    const wnll = codeWriter([src.transformations], {
      ws,
      prj: {},
      src: { requireDefault: deny, require: deny, chip: deny },
      node: {},
      stack: stack || createStack(),
      transformFile: transformFileInt,
      fileIsEmpty(file) {
        return !srcs[file]
      },
      cfg
    })
    let codenull = wnll.transform(app)
    const srcnull = wnll.resolveCode(codenull)
    if (srcnull) ws.fatal('multiple files cant return code', ws.sourceRef)

    function deny(): any {
      ws.fatal('transform multiple sources dont support that', ws.sourceRef)
    }

    function transformFileInt<CFGsub extends object, STsub extends GenNodes<CFGsub>>(
      subfilePath: string,
      subtransformations: NodeTransformer<CFGsub, STsub>
    ): void {
      genereateFile<CFGsub, STsub>(prj, subfilePath, subtransformations.transformations, subtransformations.transformNode, subtransformations.transformCFG, stack)
    }


    function genereateFile<CFG extends object, ST extends GenNodes<CFG>>(
      prj: ProjectTransformer<any, any>,
      filePath: string,
      srctransformations: ST,
      startNode: SourceNode<any>,
      cfg: CFG,
      stack: GenFuncStack
    ): void {
      const srcUsed: { [id: string]: TsNode } = {}
      let srcChipsDecl: {
        [id: string]: ChipForNodeTransformerFactory<any>
      } = {}
      let srcChipsRes: {
        [id: string]: ChipRes
      } = {}
      const srcRequires: {
        [module: string]: {
          def?: string
          ids: string[]
        }
      } = {}

      if (!filePath.startsWith('~/app/'))
        if (!filePath.startsWith('~/test/'))
          ws.fatal('genereateFile precisa começar com ~/app ou ~/test', ws.sourceRef)

      const srcfile = openSourceFile(prj.projectPath, filePath.substr(2))
      const w = codeWriter([srctransformations, prj.transformations, wstransformations], {
        ws,
        prj: {},
        src: { requireDefault: requireDefaultImport, require: requireImport, chip },
        node: {},
        stack,
        transformFile: transformFileInt,
        cfg,
        fileIsEmpty(file) {
          return !srcs[file]
        }
      })

      let part0 = w.transform(startNode) as any
      // if (isChipRes(part0)) part0=w.statements(part0.$chip$.$lines$,)
      srcChipsRes['part$0'] = {
        id: 'part$0',
        $chip$: part0,
        pos: 0
      }

      if (Object.keys(srcChipsDecl).length) ws.fatal(
        'chips nao resolvidos ' + Object.keys(srcChipsDecl).join(), ws.sourceRef)

      const rest = mapObjectToArray(srcChipsRes, (v) => v)
        .sort((a, b) => a.pos - b.pos)
        .reduce<CodePartR[]>((prev, curr) => {
          return prev.concat(curr.$chip$)
        }, [])
      const res = w.resolveCode(rest)
      mapObjectToArray(srcRequires, (val, key) => {
        const preq: string[] = [];
        if (val.def) preq.push(val.def)
        if (val.ids.length) preq.push('{ ' + val.ids.join(', ') + ' }')
        const fname = tildeExpand(filePath, key)
        // console.log('tildeExpand(', filePath, ', ', key, ')=', fname)
        srcfile.addStatements('import ' + preq.join(', ') + ' from "' + fname + '";')
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
      function requireImport(id: string, module: string, sourceRef: TsNode): string {
        if (module.startsWith('.')) throw ws.fatal('use tilde', sourceRef)
        useId(id, sourceRef)
        const req = srcRequires[module] || (srcRequires[module] = initReq())
        if (!req.ids.includes(id)) req.ids.push(id)
        return id
      }
      function requireDefaultImport(id: string, module: string, sourceRef: TsNode): string {
        if (module.startsWith('.')) throw ws.fatal('use tilde', sourceRef)
        useId(id, sourceRef)
        const req = srcRequires[module] || (srcRequires[module] = initReq())
        req.def = id
        return id
      }

      // function chip<CFG2 extends object>(pos: number, nt: () => NodeTransformerFactory<CFG2, any>): ChipForNodeTransformerFactory<CFG2>
      function chip<CFG2 extends object>(pos: number, lines: CodePartLines, block: boolean): void
      function chip<CFG2 extends object>(pos: number, nt: NodeTransformer<CFG2, any>): ChipRes
      function chip(pos: number, nt: CodePartLines | NodeTransformer<any, any>, block?: boolean): ChipRes | void
      // function chip<CFG2 extends object>(pos: number, nt: (() => NodeTransformerFactory<CFG2, any> )| NodeTransformer<CFG2, any>): ChipForNodeTransformerFactory<CFG2> | ChipRes 
      {
        // if (isNodeTransformerFactory(nt)) {
        //   const declFactory: ChipForNodeTransformerFactory<CFG2> = {
        //     $ChipDecl1$: true,
        //     transform(node, info) {
        //       return getChipRes(() => 
        //       ((nt as any)() as NodeTransformerFactory<CFG2, any>)
        //       .make(node, info.cfg))
        //     }
        //   }
        //   return declFactory
        // }
        if (isNodeTransformer(nt))
          return getChipTrans(nt)
        return addChipRes({
          $chip$: w.statements(nt as any, block || false),
          id: 'chip$' + genid++,
          pos
        })
        function getChipTrans(transformer: NodeTransformer<any, any>): ChipRes {
          const res2: [ChipRes] = w.transform(transformer) as any
          if (res2.length !== 1 || (!isChipRes(res2[0]))) {
            console.log('chip precisa de resultChip: ', res2)
            throw ws.fatal('chip precisa de resultChip', ws.sourceRef)
          }
          const [res3] = res2
          return addChipRes(res3)
        }
        function addChipRes(res3: ChipRes) {
          useId(res3.id, ws.sourceRef)
          res3.pos = pos
          srcChipsRes[res3.id] = res3
          return res3
        }
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
