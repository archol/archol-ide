import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genI18N } from './i18n'
import { genIcon } from './icon'

export const generateClientRoles = sourceTransformer({
  filePath: 'app/roles.tsx',
  transformations: {
    Application(w, app, { ws }) {
      return w.statements([
        `import React from 'react'`,
        `import { AppRole, AppRoles } from '../lib'`,
        '',
        genSysRoles(app.sysroles),
        genPkgRolesDefs(app.uses),
        genPkgRoles(app.uses),
        // genPkgRolesMerge(app.uses),
      ], false)
    },
  }
})

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
})

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
        'const ' + info.stack.get('PackageUse').alias.str + '_' + role.name.str + ': AppRole =', w.object({
          description: genI18N,
          icon: genIcon,
        }, role)
      ]
    ], false)
  },
})

const genPkgRoles = nodeTransformer({
  PackageUses(w, pkgs) {
    return w.lines([
      'export const approles = (<T extends { [pkg: string]: AppRole|{ [grp: string]: AppRole | AppRole[] }}>(v: T) => v)(',
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
        info.stack.get('PackageUse').alias.str + '_' + r.key.str,
      ]
    ]), '', '', ',')
  },
  RoleDef(w, role, info) {
    return info.stack.get('PackageUse').alias.str + '_' + role.name.str
  },
  RoleGroups(w, roles) {
    return w.lines([
      w.mapObj(roles, undefined)
    ], '', '', '')
  },
  RoleGroup(w, role) {
    return role.roles
  },
  UseLocRoles(w, role, info) {
    return w.array(
      role.ref(role).
        map((r) => info.stack.get('PackageUse').alias.str + '_' + r.name.str)
    )
  },
  // RoleDef(w, role) {
  //   return w.object({
  //     path: route.path,
  //     component: w.code(route.code, { after: 'return <AppContent />', forceRetType: '' })
  //   })
  // },
  // RoleGroup(w, role) {
  //   return w.object({
  //     path: route.path,
  //     component: w.code(route.code, { after: 'return <AppContent />', forceRetType: '' })
  //   })
  // }      
})
