import { genWS } from 'generate/lib/wsgen';
import { Application, Workspace } from 'load/types';
import { generateClient } from './client';

export async function generateMuiDeepStream(ws: Workspace, app: Application) {
  const w = genWS(ws)
  generateClient(w, app)
  await w.saveAll()
}