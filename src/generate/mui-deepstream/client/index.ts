import { projectTransformer } from 'generate/lib/generator';
import { Application } from '../../../load/types';
import { generateClientMenu } from './app/menu';
import { generateClientRoles } from './app/roles';
import { generateClientRoutes } from './app/routes'

export const generateClientProject = projectTransformer({
  projectPath: 'client',
  transformations: {},
  sources: [
    generateClientRoutes,
    generateClientRoles,
    generateClientMenu,
  ]
})
