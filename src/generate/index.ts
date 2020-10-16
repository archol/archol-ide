import { loadWorkspace } from '../load';
import { Application, Workspace } from '../load/types';
import { generateDeclaration } from './wsdecl';
import { generateMuiDeepStream } from './mui-deepstream';

export async function generateApp(ws: Workspace, app: Application) {
  await generateMuiDeepStream(ws,app)
}