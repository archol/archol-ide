
export interface ArcholWorkspace {
  apps: ArcholApplication[]
  pkgs: ArcholPackage[]
}

export interface ArcholApplication {
  name: string
}

export interface ArcholPackage {
  name: string
}