import { loadWorkspace } from '../load';

export async function generateApp(workspace: string, appName: string) {
  const ws = await loadWorkspace(workspace)
  const app = await ws.loadApp(appName)
  console.log(app)
}