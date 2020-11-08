import { info } from 'console'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { isRoleDef, isRoleGroups } from 'load/types'
import { genI18N } from './i18n'
import { genIcon } from './icon'

export const generateClientRoles = sourceTransformer({
  filePath: '~/app/roles.ts',
  cfg: {},
  transformations: {
    Application(w, app, { ws, src }) {
      src.require('AppRole', '~/lib/archol/types', app)
      src.require('AppRoles', '~/lib/archol/types', app)
      return w.statements([
        genSysRoles.make(app.sysroles, {}),
        genCompRolesDefs.make(app.uses, {}),
        genCompRoles.make(app.uses, {}),
        // genCompRolesMerge(app.uses),
      ], false)
    },
  }
})

export const genUseRoles = nodeTransformer({
  AllowLocRoles(w, roles, info) {
    return w.array(roles.ref(roles).map((r) => {
      const s = isRoleDef(r.role) ? r.comp.uri.id.str + '_role_' + r.role.name.str :
        r.comp.uri.id.str + '_role_' + r.role.name.str
      info.src.require(s, '~/app/roles', roles)
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

const genCompRolesDefs = nodeTransformer({
  ComponentUses(w, comps) {
    return comps.props.map((p) => p.val)
    // return w.lines([
    //   [
    //     'const comprolesdefs: {[app: string]:AppRoles}=',
    //     w.mapObj(comps, (val, key) => val)
    //   ]
    // ], '', '', '')
  },
  ComponentUse(w, comp) {
    return comp.ref(comp)
  },
  Component(w, comp) {
    return comp.roleDefs
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
        'export const ' + info.stack.get('ComponentUse').ref(role).uri.id.str + '_role_' + role.name.str + ': AppRole =', w.object({
          description: genI18N,
          icon: genIcon,
        }, role)
      ]
    ], false)
  },
}, {})

const genCompRoles = nodeTransformer({
  ComponentUses(w, comps) {
    return w.lines([
      'export const roles = (<T extends { [comp: string]: AppRole|{ [grp: string]: AppRole | AppRole[] }}>(v: T) => v)(',
      [w.mapObj(comps, (val, key) => val, undefined, ['...sysroles'])],
      ')'
    ], '', '', '')
  },
  ComponentUse(w, comp) {
    return comp.ref(comp)
  },
  Component(w, comp) {
    return w.mapObj([comp.roleDefs, comp.roleGroups])
  },
  RoleDefs(w, roles, info) {
    return w.lines(roles.props.map((r) => [
      [
        r.key, ':',
        info.stack.get('ComponentUse').ref(r.val).uri.id.str + '_role_' + r.key.str,
      ]
    ]), '', '', ',')
  },
  RoleDef(w, role, info) {
    return info.stack.get('ComponentUse').ref(role).uri.id.str + '_role_' + role.name.str
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
        map((r) => info.stack.get('ComponentUse').ref(role).uri.id.str + '_role_' + r.role.name.str)
    )
  },
}, {})
