import { projectTransformer } from 'generate/lib/generator';
import { Application } from '../../../load/types';
import { genI18N } from './app/i18n';
import { genIcon } from './app/icon';
import { generateClientMenu } from './app/menu';
import { generateClientRoles } from './app/roles';
import { generateClientRoutes } from './app/routes'
import { generateClientTypings } from './app/typings';
import { generateClientCompTypes } from './app/comptypes';
import { generateClientCompViews } from './app/compviews';
import { generateClientCompOperations } from './app/compoperations';
import { generateClientCompProcesses } from './app/compprocesses';
import { generateClientApp } from './app/app';

export const generateClientProject = projectTransformer({
  projectPath: 'client',
  transformations: {
    ...genI18N.transformerFactory,
    ...genIcon.transformerFactory,
  },
  sources: [
    generateClientRoutes,
    generateClientRoles,
    generateClientMenu,
    generateClientTypings,
    generateClientCompTypes,
    generateClientCompViews,
    generateClientCompOperations,
    generateClientCompProcesses,
    generateClientApp,
  ],
  cfg: {}
})
