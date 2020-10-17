import { Project, SourceFile } from 'ts-morph'
import { Workspace } from 'load/types';
import { join } from 'path';
import { mapObjectToArray } from 'utils';

export interface GenWS {
  ws: Workspace
  getProject(projectPath: string): Project
  getSourceFile(projectPath: string, filePath: string): SourceFile
  saveAll(): Promise<void>
}

export function genWS(ws: Workspace) {
  const prjs: { [name: string]: Project } = {}
  const srcs: { [name: string]: boolean } = {}
  const w: GenWS = {
    ws,
    getProject(projectPath) {
      const pn = join(ws.path, projectPath)
      const p = prjs[pn] || (prjs[pn] = new Project({
        tsConfigFilePath: join(pn, 'tsconfig.json')
      }))
      return p
    },
    getSourceFile(projectPath, filePath) {
      const fn = join(ws.path, projectPath, 'src', filePath)
      const prj = w.getProject(projectPath)
      const src = prj.getSourceFile(fn) || prj.createSourceFile(fn)
      if (!srcs[fn]) {
        src.removeText()
        srcs[fn] = true
      }
      return src
    },
    async saveAll() {
      await Promise.all(mapObjectToArray(prjs, (p) => {
        // p.getSourceFiles().forEach(src => src.formatText({
        //   indentSize: 2
        // }))
        return p.save()
      }))
    }
  }
  return w
}