import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genI18N } from './i18n'
import { genIcon } from './icon'

export const generateClientRoles = sourceTransformer({
  filePath: 'app/roles.tsx',
  transformations: {
    Application(w, app, { ws }) {
      return w.statements([
        `import React from 'react'`,
        `import { AppRoles } from '../lib'`,
        '',
        genSysRoles(app.sysroles),
        genPkgRoles(app.uses),
      ], false)
    },
  }
})

const genSysRoles = nodeTransformer({
  Roles(w, roles) {
    return w.lines([
      [
        'const sysroles=',
        w.mapObj(roles)
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

const genPkgRoles = nodeTransformer({
  PackageUses(w, pkgs) {
    return w.lines([
      [
        [
          'const pkgroles=',
          w.mapObj(pkgs, (val, key) => val)
        ]
      ]
    ], '', '', '')
  },
  PackageUse(w, pkg) {
    return pkg.ref(pkg)
  },
  Package(w, pkg) {
    return pkg.roles
  },
  Roles(w, roles) {
    return w.lines([
        w.mapObj(roles)
    ], '', '', '')
  },
  RoleDef(w, role) {
    return w.object({
      description: genI18N,
      icon: genIcon,
    }, role)
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
