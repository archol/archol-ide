import { ArcholApplication, ArcholWorkspace, raise } from '../archolTypes';
import { LinkedAllPackages, LinkedPackage, linkPkgUses } from './pkg';

export type LinkedApplication = ReturnType<typeof linkApp>

export async function linkApp(appName: string, ws: ArcholWorkspace) {
  const decl = ws.apps.filter((a) => a.name === appName)[0]
  if (!decl) raise(ws, 'Package URI not found: ' + appName)
  const allPackages: LinkedAllPackages<LinkedPackage> = {
    byId: {}, byUri: {},
    get(uri) {
      const ret = allPackages.byUri[uri]
      if (!ret) raise(ws, 'Package URI not found: ' + uri)
      return ret
    },
    genId(_uri, _parents, aliases) {
      return aliases.join('_')
    }
  }
  await linkPkgUses([], allPackages, decl.uses)
  return {
    name: decl.name,
    uses: await Promise.all(decl.uses.map(async (u) => {
      return {
        alias: u.alias,
        uri: u.uri,
        pkg: await allPackages.get(u.uri).pkg
      }
    })),
    generate: decl.generate
  }
}