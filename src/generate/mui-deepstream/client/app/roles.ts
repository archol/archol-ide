import { info } from 'console'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isRoleDef, isRoleGroups } from 'load/types'
import { genI18N } from './i18n'
import { genIcon } from './icon'

export const generateClientRoles = sourceTransformer({
  filePath: 'app/roles.ts',
  cfg: {},
  transformations: {
    Application(w, app, { ws, src }) {
      src.require('AppRole', '~/lib', app)
      src.require('AppRoles', '~/lib', app)
      return w.statements([
        genSysRoles.make(app.sysroles, {}),
        genPkgRolesDefs.make(app.uses, {}),
        genPkgRoles.make(app.uses, {}),
        // genPkgRolesMerge(app.uses),
      ], false)
    },
  }
})

export const genUseRoles = nodeTransformer({
  AllowLocRoles(w, roles, info) {
    return w.array(roles.ref(roles).map((r) => {
      const s = isRoleDef(r.role) ? r.pkg.uri.id.str + '_role_' + r.role.name.str :
        r.pkg.uri.id.str + '_role_' + r.role.name.str
      info.src.require(s, './roles', roles)
      return s
    }))
  },
  AllowSysRole(w, role) {
    return role.role
  },
}, {})

const genSysRoles = nodeTransformer({
  RoleDefs(w, roles) {
    return w.lines([
      [
        'const sysroles = (<T extends AppRoles>(v: T) => v)(',
        w.mapObj(roles),
        ')'
      ]
    ], '', '', '')
  },
  RoleDef(w, role) {
    return w.object({
      description: genI18N,
      icon: genIcon,
    }, role)
  }
}, {})

const genPkgRolesDefs = nodeTransformer({
  PackageUses(w, pkgs) {
    return pkgs.props.map((p) => p.val)
    // return w.lines([
    //   [
    //     'const pkgrolesdefs: {[app: string]:AppRoles}=',
    //     w.mapObj(pkgs, (val, key) => val)
    //   ]
    // ], '', '', '')
  },
  PackageUse(w, pkg) {
    return pkg.ref(pkg)
  },
  Package(w, pkg) {
    return pkg.roleDefs
  },
  RoleDefs(w, roles) {
    return roles.props.map((p) => p.val)
    // return w.lines([
    //   w.mapObj(roles, undefined)
    // ], '', '', '')
  },
  RoleDef(w, role, info) {
    return w.statements([
      [
        'export const ' + info.stack.get('PackageUse').ref(role).uri.id.str + '_role_' + role.name.str + ': AppRole =', w.object({
          description: genI18N,
          icon: genIcon,
        }, role)
      ]
    ], false)
  },
}, {})

const genPkgRoles = nodeTransformer({
  PackageUses(w, pkgs) {
    return w.lines([
      'export const roles = (<T extends { [pkg: string]: AppRole|{ [grp: string]: AppRole | AppRole[] }}>(v: T) => v)(',
      [w.mapObj(pkgs, (val, key) => val, undefined, ['...sysroles'])],
      ')'
    ], '', '', '')
  },
  PackageUse(w, pkg) {
    return pkg.ref(pkg)
  },
  Package(w, pkg) {
    return w.mapObj([pkg.roleDefs, pkg.roleGroups])
  },
  RoleDefs(w, roles, info) {
    return w.lines(roles.props.map((r) => [
      [
        r.key, ':',
        info.stack.get('PackageUse').ref(r.val).uri.id.str + '_role_' + r.key.str,
      ]
    ]), '', '', ',')
  },
  RoleDef(w, role, info) {
    return info.stack.get('PackageUse').ref(role).uri.id.str + '_role_'  + role.name.str
  },
  RoleGroups(w, roles) {
    return w.lines([
      w.mapObj(roles, undefined)
    ], '', '', '')
  },
  RoleGroup(w, role) {
    return role.allow
  },
  AllowLocRoles(w, role, info) {
    return w.array(
      role.ref(role).
        map((r) => info.stack.get('PackageUse').ref(role).uri.id.str + '_role_' + r.role.name.str)
    )
  },
}, {})
