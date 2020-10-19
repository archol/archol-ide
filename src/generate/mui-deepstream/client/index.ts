import { projectTransformer } from 'generate/lib/generator';
import { Application } from '../../../load/types';
import { generateClientRoles } from './app/roles';
import { generateClientRoutes } from './app/routes'

export const generateClientProject = projectTransformer({
  projectPath: 'client',
  transformations: {},
  sources: [
    generateClientRoutes,
    generateClientRoles
  ]
})
