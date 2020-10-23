import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateClientTypes = sourceTransformer({
  filePath: 'app/types.tsx',
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
      return src.chip(pkg.ref(pkg).uri.id.str + 'Ref', pkg, () => genPkgRef(pkg))
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
          src.chip(pkguri + '_' + key.str + 'Ref', pkg, () => genProcessRef(val))
        )
      })
    ]
  },   
})

const genProcessRef = nodeTransformer({  
  Process(w, proc, info) {
    console.log(proc.name.str)
    return info.stack.get('PackageUse').alias.str + '_' + proc.name
    // return w.object({
    //   start: '()=>{}'
    // })
  },  
})
