import { join } from 'path';
import { ArcholWorkspace } from '../archolTypes';
import { CodeBlockWriter, Project } from 'ts-morph';
import { linkApp } from '../linker';

export async function generateApp(name: string, ws: ArcholWorkspace) {
  console.log('gerando')
  const app = await linkApp(name, ws)
  const serverProject = new Project({

    tsConfigFilePath: absolutePath('server', 'tsconfig.json'),
    addFilesFromTsConfig: false,
  })
  const clientProject = new Project({
    tsConfigFilePath: absolutePath('client', 'tsconfig.json'),
    addFilesFromTsConfig: false,
  })
  await generateServer()
  await generateClient()
  await serverProject.save()
  await clientProject.save()
  async function generateServer() {
    const ts = createSource(absolutePath('server', 'app/index.ts'), (w) => {
      w.writeLine('import bootApp from \'../lib/bootApp\'');
      w.writeLine('bootApp("' + app.name + '");');
    })
    function createSource(relative: string, fn: (w: CodeBlockWriter) => void) {
      const ts = serverProject.createSourceFile(absolutePath('server', relative), fn, { overwrite: true })
      ts.formatText({
        indentSize: 2
      })
      return ts;
    }
  }
  async function generateClient() {
    createSource('src/app/index.tsx', (w) => {
      w.writeLine('import React from \'react\'')
      w.writeLine('export function renderApp() {')
        .writeLine('return <div>' + app.name + '</div>;')
        .writeLine('}');
    })
    function createSource(relative: string, fn: (w: CodeBlockWriter) => void) {
      const ts = serverProject.createSourceFile(absolutePath('client', relative), fn, { overwrite: true })
      ts.formatText({
        indentSize: 2
      })
      return ts;
    }
  }
  function absolutePath(kind: 'client' | 'server', relative: string) {
    return join(app.generate.path, kind, relative)
  }
}