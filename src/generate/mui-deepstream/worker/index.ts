import { projectTransformer } from 'generate/lib/generator';
import { genI18N } from '../client/app/i18n';
import { generateWorkerIndex } from './app';

export const generateWorkerProject = projectTransformer({
  projectPath: 'client',
  transformations: {
    ...genI18N.transformerFactory,
  },
  sources: [
    generateWorkerIndex
  ],
  cfg: {}
})
