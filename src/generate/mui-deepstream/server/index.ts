import { projectTransformer } from 'generate/lib/generator';
import { genI18N } from '../client/app/i18n';
import { generateServerIndex } from './app';

export const generateServerProject = projectTransformer({
  projectPath: 'server',
  transformations: {
    ...genI18N.transformerFactory,
  },
  sources: [
    generateServerIndex
  ],
  cfg: {}
})


/*

https://github.com/websockets/ws/blob/3d5066a7cad9fe3176002916aeda720a7b5ee419/examples/express-session-parse/index.js

https://github.com/uNetworking/uWebSockets.js // fast
https://github.com/coast-team/netflux // webrtc

*/
