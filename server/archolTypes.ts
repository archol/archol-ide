
export function raise(node: { node: ArcholNode<any> }, msg: string): void {
  if (node.node.raise) node.node.raise(msg)
  else throw new Error(msg)
}

export interface ArcholWorkspace {
  node: ArcholNode<'workspace'>
  apps: ArcholApplication[]
  pkgs: ArcholPackage[]
}

export interface ArcholNode<KIND extends string> {
  kind: KIND
  raise?(msg: string): void
}

export interface ArcholApplication {
  node: ArcholNode<'application'>
  name: string,
  uri: string,
  generate: {
    path: string,
    number: 1
  },
  uses: ArcholPackageUse[]
  menu: ArcholMenuItem[]
  route: ArcholRoute[]
}

export interface ArcholPackageUse {
  node: ArcholNode<'packageUse'>
  alias: string
  uri: string
}

export interface ArcholPackage {
  node: ArcholNode<'package'>
  uri: string
  uses: ArcholPackageUse[]
}

export interface ArcholMenuItem {
  node: ArcholNode<'menuItem'>
  title: ArcholI18N
  routePath: ArcholRoutePath
  icon: ArcholIcon
}

export interface ArcholRoute {
  node: ArcholNode<'route'>
  routePath: ArcholRoutePath
}

export interface ArcholRoutePath {
  node: ArcholNode<'routePath'>
  path: string
}

export interface ArcholIcon {
  node: ArcholNode<'icon'>
  path: string
}

export interface ArcholI18N {
  node: ArcholNode<'i18n'>
  msg: {
    [lang: string]: string
  }
}
