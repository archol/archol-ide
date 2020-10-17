import { GenWS } from 'generate/lib/wsgen';
import { Application } from '../../../load/types';
import { generateClientRoles } from './app/roles';
import {generateClientRoutes} from './app/routes'

export function generateClient(w: GenWS, app: Application) {
  generateClientRoutes(app, w)
  generateClientRoles(app, w)
}