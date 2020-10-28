import { CodePartL } from 'generate/lib/codeWriter'
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { format } from 'path'
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
                // ['export const appInstance = ', app.uses],
                ['export const ' + app.name.str + '=appInstance'],
            ], false)
        },
        PackageUses(w, pkgs) {
            return [w.mapObj(pkgs, (val, key) => val)]
        },
        PackageUse(w, pkg, { src }) {
            const pkguri = pkg.ref(pkg).uri.id.str
            return src.chip(-1, genPkgRef.make(pkg.ref(pkg), { pkguri }))
        },
    },
})

const genPkgRef = nodeTransformer({
    Package(w, pkg, { src }) {
        const pkguri = pkg.uri.id.str
        return w.chipResult(pkguri, [
            'export const ', pkguri, 'Instance = ',
            w.object({
                types: w.mapObj(pkg.types, (val, key) =>
                    src.chip(
                        -1000,
                        genType.make(val, { pkguri })
                    )
                ),
                process: w.mapObj(pkg.processes, (val, key) =>
                    src.chip(-10, genProcessRefTypes.make(val, { pkguri }))
                ),
                view: w.mapObj(pkg.views, (val, key) =>
                    src.chip(-10, genViewInstanceType.make(val, { pkguri }))
                )
            })
        ], false)
    },
}, {})

const genProcessRefTypes = nodeTransformer({
    Process(w, proc, info) {
        const procuripref = info.cfg.pkguri + '_proc_' + proc.name.str
        const procuri = procuripref + 'Instance'
        // info.src.chip(procuri, proc, -10, () => genProcessInstanceType.make(proc, { procuri }))
        return w.chipResult(procuri, [
            // 'export interface ' + procuri + 'Ref',
            // w.object({
            //     start: w.funcDecl(proc.vars.input.props
            //         .map((v) => v.key.str + ':' + v.val.type.base(v.val)), procuri + 'Instance', null)
            // })
        ], false)
    },
}, { pkguri: '' })


const genType = nodeTransformer({
    NormalType() {
        return ""
    },
    EnumType(w, t, info) {
        const id = info.cfg.pkguri + '_enum_' + t.name.str
        info.src.require('ArcholType', '~/lib/archol/types', t)
        info.src.require('T' + id, './types', t)
        return w.chipResult(id, [
            [
                'export const ', id, ': ArcholType<T',
                info.cfg.pkguri, '_enum_', t.name.str,
                '> = ',
                w.object({
                    validate: w.funcDecl(['val: T' + id], 'string|undefined',
                        t.options.props.map((o) => ['if (val===', w.string(o.key.str), ') return'])
                            .concat([
                                "return 'Valor inválido'"
                            ])
                    ),
                    parse: w.funcDecl(['str: string | undefined'], 'T' + id + '|undefined',
                        t.options.props.map((o) => ['if (str===', w.string(o.key.str), ') return str'] as CodePartL).concat(
                            t.options.props.map((o) => ['if (str===', o.val.description, '()) return ', o.key])
                        ).concat([
                            "return"
                        ])),
                    format: w.funcDecl(['val: T' + id], 'string',
                        t.options.props.map((o) => ['if (val===', w.string(o.key.str), ') return ', o.val.description, '()'] as CodePartL).
                            concat([
                                "return ''"
                            ])),
                })
            ]
        ], false)
    },
    ComplexType(w, t, info) {
        const id = info.cfg.pkguri + '_complex_' + t.name.str
        return w.chipResult(id, [
            'export const TODO_', info.cfg.pkguri, '_complex_', t.name.str, ' = TODO',
        ], false)
    },
    ArrayType(w, t, info) {
        const id = info.cfg.pkguri + '_array_' + t.name.str
        return w.chipResult(id, [
            'export const TODO_', info.cfg.pkguri, '_arr_', t.name.str, ' = TODO',
        ], false)
    },
}, { pkguri: '' })

const genViewInstanceType = nodeTransformer({
    View(w, view, info) {
        info.src.require('ArcholVars', '~/lib/archol/types', view)
        const viewuri = info.cfg.pkguri + '_view_' + view.name.str
        return w.chipResult(viewuri, [
            'export const ' + viewuri + 'Instance = {}',
            // w.object({
            //     vars: ['ArcholVars<', genFields.make(view.refs.fields, {}), '>']
            // })
        ], false)
    },
}, { pkguri: '' })
