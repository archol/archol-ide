import { loadWorkspace } from '../load';
import { Application, Workspace } from '../load/types';
import { generateDeclaration } from './wsdecl';

export async function generateApp(ws: Workspace, app: Application) {
  console.log('gen '+app.name)
}