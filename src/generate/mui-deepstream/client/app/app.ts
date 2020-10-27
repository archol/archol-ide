import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFields } from './fields'

// const cadastrarVoluntario: cvv_org_br_cadastro_proc_cadastrarVoluntarioRef = {
//     start(cpf) {

//     }
//   }
//   const appInstance: AppRef = {
//     cadastro: {
//       process: {
//         cadastrarVoluntario
//       }
//     },
//     secretaria: {},
//     dashboard: {},
//   }


//   start() {
//     contentDoc.start({
//       title: 'x',

//     })
//   }

export const generateClientApp = sourceTransformer({
    filePath: '~/app/app.ts',
    cfg: {},
    transformations: {
        Application(w, app, { src }) {
            src.require('contentDoc', '~/docs/app/content', app)
            return w.statements([
                ['export const appInstance = ', app.uses],
                ['export const ' + app.name.str + '=appInstance'],
            ], false)
        },
        PackageUses(w, pkgs) {
            return [w.mapObj(pkgs, (val, key) => val)]
        },
        PackageUse(w, pkg, { src }) {
            const pkguri = pkg.ref(pkg).uri.id.str
            return src.chip(pkguri + 'Instance', pkg, -1, () => genPkgRef.make(pkg, { pkguri }))
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
        pkg.types.props.forEach(t => src.chip(
            '', t.val, -1000, () => genType.make(t.val, { pkguri }))
        )
        return [
            'export const ', pkguri, 'Instance = ',
            w.object({
                process: w.mapObj(pkg.processes, (val, key) =>
                    src.chip(pkguri + '_proc_' + key.str + 'Ref', pkg, -10, () => genProcessRefTypes.make(val, { pkguri }))
                ),
                view: w.mapObj(pkg.views, (val, key) =>
                    src.chip(pkguri + '_view_' + key.str + 'Instance', pkg, -10, () => genViewInstanceType.make(val, { pkguri }))
                )
            })
        ]
    },
}, {})

const genProcessRefTypes = nodeTransformer({
    Process(w, proc, info) {
        const procuri = info.cfg.pkguri + '_proc_' + proc.name.str
        info.src.chip(procuri + 'Instance', proc, -10, () => genProcessInstanceType.make(proc, { procuri }))
        return [
            '{}'
            // 'export interface ' + procuri + 'Ref',
            // w.object({
            //     start: w.funcDecl(proc.vars.input.props
            //         .map((v) => v.key.str + ':' + v.val.type.base(v.val)), procuri + 'Instance', null)
            // })
        ]
    },
}, { pkguri: '' })

const genProcessInstanceType = nodeTransformer({
    Process(w, proc, info) {
        return w.statements([
            [
                'export const ', info.cfg.procuri, 'Instance = {}',
                // w.object({
                //     vars: [info.cfg.procuri, 'InstanceVars']
                // })
            ],
            [
                'export const ', info.cfg.procuri, 'InstanceVars = {}',
                // w.object({
                //     local: genFields.make(proc.vars.local, {}),
                //     input: genFields.make(proc.vars.input, {}),
                //     output: genFields.make(proc.vars.output, {}),
                // })
            ],
        ], false)
    },
}, { procuri: '' })

const genType = nodeTransformer({
    NormalType() {
        return ""
    },
    EnumType(w, t, info) {
        return [
            'export const ', info.cfg.pkguri, '_enum_', t.name.str, ': Type = {}',
            // t.options.props.map((o) => w.string(o.key.str)).join(' | ')
        ]
    },
    ComplexType(w, t, info) {
        return [
            'export const TODO_', info.cfg.pkguri, '_complex_', t.name.str, ' = TODO',
        ]
    },
    ArrayType(w, t, info) {
        return [
            'export const TODO_', info.cfg.pkguri, '_arr_', t.name.str, ' = TODO',
        ]
    },
}, { pkguri: '' })

const genViewInstanceType = nodeTransformer({
    View(w, view, info) {
        info.src.require('ArcholVars', '~/lib/archol/types', view)
        const viewuri = info.cfg.pkguri + '_view_' + view.name.str
        return [
            'export const ' + viewuri + 'Instance = {}',
            // w.object({
            //     vars: ['ArcholVars<', genFields.make(view.refs.fields, {}), '>']
            // })
        ]
    },
}, { pkguri: '' })