import { Application, Workspace } from 'load/types';
import { generateApplication } from 'generate/lib/generator';
import { generateClientProject } from './client';

export function generateMuiDeepStream(ws: Workspace, app: Application) {
  generateApplication({
    ws,
    app,
    projects: [
      generateClientProject
    ],
    transformations: {

    },
    cfg: {}
  })
}