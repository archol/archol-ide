import { projectTransformer } from 'generate/lib/generator';
import { Application } from '../../../load/types';
import { generateClientMenu } from './app/menu';
import { generateClientRoles } from './app/roles';
import { generateClientRoutes } from './app/routes'
import { generateClientTypes } from './app/types';
import { generateClientViews } from './app/views';

export const generateClientProject = projectTransformer({
  projectPath: 'client',
  transformations: {},
  sources: [
    generateClientRoutes,
    generateClientRoles,
    generateClientMenu,
    generateClientTypes,
    generateClientViews,
  ],
  cfg: {}
})
 