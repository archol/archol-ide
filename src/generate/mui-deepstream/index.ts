import { CodeBlockWriter } from 'ts-morph';
import { Application, Package, Process, Workspace, Function, Task, View, Type, Document, Fields, SourceNodeWithName, SourceNode } from '../../load/types';
import { quote, typePipeObj, typePipeStr } from '../generator';

export async function generateDeclaration(ws: Workspace) {
  const declFileName = ws.path + '/ws/decl.d.ts'
  const sources = ws.ts.getSourceFiles()
  let declsource = sources.filter(s => s.getFilePath() === declFileName)[0]

  if (!declsource) declsource = ws.ts.createSourceFile(declFileName)

  declsource.removeText()

  for (const s of sources
    .map(s => s.getBaseName())
    .filter(s => s.endsWith('.app.ts'))) {
    const app = await ws.loadApp(s.replace(/\.app\.ts$/g, ''))
    genDeclApp(app)
  }
  declsource.formatText({
    indentSize: 2
  })
  return ws.ts.save()
  function genDeclApp(app: Application) {
    const appname = app.name.str
  }
}