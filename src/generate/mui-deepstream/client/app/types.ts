import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateClientTypes = sourceTransformer({
  filePath: 'app/types.tsx',
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        ['export interface AppRef ', app.uses],
        genPkgRef(app.uses)
      ], false)
    },
    PackageUses(w, pkgs) {
      return [w.mapObj(pkgs, (val, key) => val)]
    },
    PackageUse(w, pkg) {
      return pkg.ref(pkg).uri.id.str + 'Ref'
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
  Package(w, pkg) {
    return [
      'export interface ', pkg.uri.id.str, 'Ref {',
      'x',
      '}'
    ]
  },
  // RoleDefs(w, roles, info) {
  //   return w.lines(roles.props.map((r) => [
  //     [
  //       r.key, ':',
  //       info.stack.get('PackageUse').alias.str + '_' + r.key.str,
  //     ]
  //   ]), '', '', ',')
  // },
  // RoleDef(w, role, info) {
  //   return info.stack.get('PackageUse').alias.str + '_' + role.name.str
  // },
  // RoleGroups(w, roles) {
  //   return w.lines([
  //     w.mapObj(roles, undefined)
  //   ], '', '', '')
  // },
  // RoleGroup(w, role) {
  //   return role.roles
  // },
  // UseLocRoles(w, role, info) {
  //   return w.array(
  //     role.ref(role).
  //       map((r) => info.stack.get('PackageUse').alias.str + '_' + r.name.str)
  //   )
  // },  
})
