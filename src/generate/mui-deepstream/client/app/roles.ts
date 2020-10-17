import { generator } from 'generate/lib/generator'

export const generateClientRoles = generator({
  project: 'client',
  file: 'app/roles.tsx',
  opts: {},
  transverse: {
    Application(w, app) {
      return w.statements([
        `import React from 'react'`,
        `import { AppRoles } from '../lib'`,
        '',
        ['export const roles = ', w.map([app.sysroles, app.uses])],
      ], false)
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
  }
})

