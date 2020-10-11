import { ArcholApplication, ArcholPackage, ArcholPackageUse } from 'archolTypes';

export type LinkedPackage = ReturnType<typeof linkPkg>
export interface LinkedAllPackage<T> {
  id: string
  uri: string,
  pkg: Promise<T>
}
export interface LinkedAllPackages<T> {
  byId: {
    [id: string]: LinkedAllPackage<T>,
  },
  byUri: {
    [uri: string]: LinkedAllPackage<T>,
  },
  get(uri: string): LinkedAllPackage<T>
  genId(uri: string, parents: Array<ArcholApplication | ArcholPackage>, aliases: string[]): string
}

export async function linkPkgUses(parent: string[], allPackages: LinkedAllPackages<LinkedPackage>, uses: ArcholPackageUse[]) {
}

export async function linkPkg(allPackages: LinkedAllPackages<any>, pkg: ArcholPackage) {
  await linkPkgUses([], allPackages, pkg.uses)
  return {
    id: allPackages.get(pkg.uri).id,
    uses: await Promise.all(pkg.uses.map(async (u) => {
      return {
        alias: u.alias,
        uri: u.uri,
        pkg: await allPackages.get(u.uri).pkg
      }
    }))
  }
}