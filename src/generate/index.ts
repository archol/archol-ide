import { loadWorkspace } from '../load';

export async function generateApp(workspace: string, appName: string) {
  const app = (await loadWorkspace(workspace)).loadApp(appName)
  console.log(app)
}