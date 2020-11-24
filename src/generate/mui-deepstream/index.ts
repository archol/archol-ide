import { Application, Workspace } from 'load/types';
import { generateApplication } from 'generate/lib/generator';
import { generateClientProject } from './client';
import { generateWorkerProject } from './worker';
import { generateServerProject } from './server';

export function generateMuiDeepStream(ws: Workspace, app: Application) {
  generateApplication({
    ws,
    app,
    projects: [
      generateClientProject,
      generateWorkerProject,
      generateServerProject,
    ],
    wstransformations: {

    },
    cfg: {}
  })
}