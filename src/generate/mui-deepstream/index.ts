import { genWS } from 'generate/lib/wsgen';
import { Application, Workspace } from 'load/types';
import { generateClient } from './client';

export async function generateMuiDeepStream(ws: Workspace, app: Application) {
  console.log('1')
  const w = genWS(ws)
  console.log('2')
  generateClient(w, app)
  console.log('3')
  await w.saveAll()
  console.log('4')
}