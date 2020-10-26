import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'

export const generateClientViews = sourceTransformer({
    multiple: true,
    cfg: {},
    transformations: {
    Application(w, app) {
      return app.uses.props.map( (pkguse)=> {
        return pkguse.val.ref(pkguse.val.sourceRef)
      })
    },
    Package(w, pkg, { transformFile }) {        
      const pkguri = pkg.uri.id.str
      pkg.views.props.forEach( (v)=> {
        console.log('TEMP',v.key.str)
        // transformFile(pkg.uri.id.str+'/views/'+v.key.str, genView.make(v.val, {pkguri}))
      })
      return ''
    },  
}})

const genView = nodeTransformer({
  View(w, v) {
    return v.name.str
  },  
}, {pkguri: ''})

// const genProcessRef = nodeTransformer({
//   Process(w, proc, info) {
//     const procuri = info.cfg.pkguri + '_' + proc.name.str
//     info.src.chip(procuri + 'Instance', proc, () => genProcessInstance.make(proc, { procuri }))
//     return [
//       'export interface ' + procuri + 'Ref',
//       w.object({
//         start: w.methodDecl([], procuri + 'Instance', null)
//       })
//     ]
//   },
// }, { pkguri: '' })

// const genProcessInstance = nodeTransformer({
//   Process(w, proc, info) {
//     return w.statements([
//       [
//         'export interface ', info.cfg.procuri, 'Instance',
//         w.object({
//           vars: [info.cfg.procuri, 'InstanceVars']
//         })
//       ],
//       [
//         'export interface ', info.cfg.procuri, 'InstanceVars',
//         w.object({
//           local: genFields.make(proc.vars.local, {}),
//           input: genFields.make(proc.vars.input, {}),
//           output: genFields.make(proc.vars.output, {}),
//         })
//       ],
//     ], false)
//   },
// }, { procuri: '' })

// const genFields = nodeTransformer({
//   Fields(w, fields, info) {
//     return w.mapObj(fields, (f) => {
//       return f.type.base(f)
//     })
//   },
// }, {})

// const genType = nodeTransformer({
//   NormalType() {
//     return ""
//   },
//   EnumType(w, t, info) {
//     return [
//       'export type ', info.cfg.pkguri, '_enum_', t.name.str, ' = ',
//       t.options.props.map((o) => w.string(o.key.str)).join(' | ')
//     ]
//   },
//   ComplexType(w, t, info) {
//     return [
//       'export type TODO_', info.cfg.pkguri, '_complex_', t.name.str, ' = TODO',      
//     ]
//   },
//   ArrayType(w, t, info) {
//     return [
//       'export type TODO_', info.cfg.pkguri, '_arr_', t.name.str, ' = TODO',      
//     ]
//   },
// }, { pkguri: '' })



// import React from 'react'
// import { Markdown } from '../../../lib/components/markdown'
// import { cvv_org_br_dashboard_bemvindoInstance } from '../../types'

// export function ViewtelaHome({ proc }: {vars: cvv_org_br_dashboard_bemvindoInstance }) {
//   const text=`# Olá mundo`
//   return <Markdown text={text} />
// }
