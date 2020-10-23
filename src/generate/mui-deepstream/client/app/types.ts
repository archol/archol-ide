import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateClientTypes = sourceTransformer({
  filePath: 'app/types.tsx',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        ['export interface AppRef ', app.uses],
        // genPkgRef(app.uses)
      ], false)
    },
    PackageUses(w, pkgs) {
      return [w.mapObj(pkgs, (val, key) => val)]
    },
    PackageUse(w, pkg, { src }) {
      const pkguri = pkg.ref(pkg).uri.id.str
      return src.chip(pkguri + 'Ref', pkg, () => genPkgRef.make(pkg, { pkguri }))
    },
  },
})

const genPkgRef = nodeTransformer({
  PackageUses(w, pkgs) {
    return w.statements(pkgs.props, false)
  },
  PackageUse(w, pkg) {
    return pkg.ref(pkg)
  },
  Package(w, pkg, { src }) {
    const pkguri = pkg.uri.id.str
    return [
      'export interface ', pkguri, 'Ref',
      w.object({
        process: w.mapObj(pkg.processes, (val, key) =>
          src.chip(pkguri + '_' + key.str + 'Ref', pkg, () => genProcessRef.make(val, { pkguri }))
        )
      })
    ]
  },
}, {})

const genProcessRef = nodeTransformer({
  Process(w, proc, info) {
    const procuri = info.cfg.pkguri + '_' + proc.name.str
    info.src.chip(procuri + 'Instance', proc, () => genProcessInstance.make(proc, { procuri }))
    return [
      'export interface ' + procuri + 'Ref',
      w.object({
        start: w.methodDecl([], procuri + 'Instance', null)
      })
    ]
    //"xxx"//info.stack.get('PackageUse').alias.sstr + '_' + proc.name
  },
}, { pkguri: '' })

const genProcessInstance = nodeTransformer({
  Process(w, proc, info) {
    return [
      'export interface ', info.cfg.procuri, 'Instance{}'
    ]
  },
}, { procuri: '' })
