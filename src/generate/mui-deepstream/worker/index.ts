import { projectTransformer } from 'generate/lib/generator';
import { genI18N } from '../client/app/i18n';

export const generateClientProject = projectTransformer({
  projectPath: 'client',
  transformations: {
    ...genI18N.transformerFactory,
  },
  sources: [
  ],
  cfg: {}
})
