
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { Component } from 'load/types'
import { ParameterDeclaration } from 'ts-morph'
import { genFieldsWithBase, genFieldsWithType } from '../common/fields'
import { genUseType } from '../common/useType'

export const generateServerTypings = sourceTransformer({
  filePath: '~/app/typings.ts',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        [
          'export interface TAppRef ', app.uses
        ],
        [
          app.testscenarios.items.map((scenario) => {
            return ['export interface TAppRefProxy',
              w.mapObj(app.uses, (val, key) => {
                const compuri = val.ref(val).nodeMapping.uri('_')
                const proxy = 'T' + compuri + 'RefProxy'
                return proxy
              })
            ]
          })
        ],
        [
          'export interface TDbProxy ', w.mapObj(app.uses,
            (ucomp) => 'T' + ucomp.ref(ucomp.sourceRef).uri.id.str + 'DbProxy'
          )
        ],
        'export type Tstring=string',
        'export type Tnumber=number',
        'export type Tboolean=boolean',
        'export type Tdate=number',
      ], false)
    },
    ComponentUses(w, comps) {
      return w.statements([w.mapObj(comps, (val, key) => val)], false)
    },
    ComponentUse(w, comp, { src }) {
      return src.chip(1, genCompRef.make(comp.ref(comp), {}))
    },
  },
})

const genCompRef = nodeTransformer({
  Component(w, comp, { src }) {
    const compuri = comp.uri.id.str
    comp.types.props.forEach(t => src.chip(
      1,
      genType.make(t.val, { compuri })) && ''
    )
    const compid = 'T' + compuri
    return w.chipResult(compid + 'Ref', [
      [
        'export interface ' + compid + 'Ref',
        w.object({
          type: w.mapObj(comp.types, (val, key) =>
            ['T', val.nodeMapping.uri]
          ),
          document: w.mapObj(comp.documents, (val) =>
            src.chip(10, genDocType.make(val, { comp, compuri }))
          ),
          // process: w.mapObj(comp.processes, (val, key) =>
          //   src.chip(10, genProcessRef.make(val, { compuri }))
          // ),
          // view: w.mapObj(comp.views, (val, key) =>
          //   src.chip(20,
          //     genViewInstanceType.make(val, { compuri }))
          // ),
          // operation: w.mapObj(comp.operations, (val, key) =>
          //   src.chip(30,
          //     genOpInstanceType.make(val, { compuri }))
          // ),
        }),
        [
          'export interface ' + compid + 'RefProxy',
          w.mapObj(comp.documents, (val, key) =>
            w.property(
              val.nodeMapping.uri('_', true),
              ['T', val.nodeMapping.uri(), 'RefProxy']
            )
          ),
        ],
        [
          'export interface ' + compid + 'Database',
          w.mapObj(comp.documents, (val, key) =>
            w.property(
              val.nodeMapping.uri('_', true),
              ['Collection<T', val.nodeMapping.uri(), 'GUID, T', val.nodeMapping.uri(), 'State, T', val.nodeMapping.uri(), 'Data>']
            )
          ),
        ]
      ],
      [
        'export interface ' + compid + 'DbProxy',
        w.object({
          document: w.mapObj(comp.documents, (val) =>
            src.chip(10, genDocType.make(val, { comp, compuri })).id.replace(/Exec$/g, 'DbProxy')
          ),
        }),
      ],
    ], false)
  },
}, {})

const genDocType = nodeTransformer({
  Document(w, doc, info) {
    info.src.require('Collection', '~/lib/types', doc)
    const doct = 'T' + doc.nodeMapping.uri()
    const doctData = w.mapObj(
      doc.primaryFields.merge(doc.secondaryFields), (f) => {
        return 'T' + f.type.base(f)
      })
    doctData.insert([
      ['$id: ' + doct + 'GUID'],
      ['$state: ' + doct + 'State'],
    ])
    return w.chipResult(doct + 'Exec', [
      ['export type ', doct, 'GUID = ', w.stringType([doct + '$GUID', ...info.cfg.comp.testingGUIDs(doc.name.str)])],
      ['export type ', doct, 'State = ', w.stringType(doc.states.props.map((v) => v.key))],
      ['export interface ', doct, 'Data', doctData],
      [
        'export interface ', doct, 'DbProxy', w.object({
          get: w.funcDecl(['$id: ' + doct + 'GUID'], 'Promise<' + doct + 'Data>', null)
        })
      ],
      ['export interface ', doct, 'Exec',
        w.mapObj(doc.actions, (ac) => {
          const acargs = ac.run && ac.run.params.length ? ac.run.params : ['data']
          const acret = (!ac.from) ?
            'Promise<' + doct + 'GUID>' : ((!ac.to) ? 'Promise<void>' :
              (ac.run && ac.run.ret.getText()) || 'Promise<void>'
            )
          return w.code(ac.run, {
            forceParams: acargs,
            forceParamType(p, idx) {
              if (idx === 0) return doct + 'Data'
            },
            beforeParams: ['db: T' + info.cfg.compuri + 'Database'],
            forceRetType: acret,
            declOnly: true,
          })
        })
      ],
      ['export interface ', doct, 'RefProxy',
        w.mapObj(doc.actions, (ac) => {
          const acargs: Array<ParameterDeclaration | string> = ac.run && ac.run.params.length ? ac.run.params : ['data']
          if (ac.from) acargs.splice(1, 0, '$id: ' + doct + 'GUID')
          const acret = (!ac.from) ?
            'Promise<' + doct + 'GUID>' : ((!ac.to) ? 'Promise<void>' :
              (ac.run && ac.run.ret.getText()) || 'Promise<void>'
            )
          return w.code(ac.run, {
            forceParams: acargs,
            forceParamType(p, idx) {
              if (idx === 0) return false
            },
            forceRetType: acret,
            declOnly: true,
          })
        })
      ],
    ], false)
  },
  DocField(w, doc, { src, cfg }) {
    return [doc.name.str, ':', doc.type]
  },
  ...genUseType.transformerFactory,
}, { comp: null as any as Component, compuri: '' })

const genType = nodeTransformer({
  NormalType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.base().base
      ]
    ], false)
  },
  EnumType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, ' = ',
        t.options.props.map((o) => w.string(o.key.str)).join(' | ')
      ]
    ], false)
  },
  ComplexType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      [
        'export type ', id, t.name.str, ' = TODO',
      ]
    ], false)
  },
  ArrayType(w, t, info) {
    const id = 'T' + info.cfg.compuri + '_type_' + t.name.str
    return w.chipResult(id, [
      'export type ', id, ' = TODO',
    ], false)
  },
}, { compuri: '' })

const genViewInstanceType = nodeTransformer({
  View(w, view, info) {
    info.src.require('SingletonBinder', '~/lib/archol/singleton', view)
    info.src.require('SingletonBinding', '~/lib/archol/singleton', view)

    const id = 'T' + info.cfg.compuri + '_view_' + view.name.str
    return w.chipResult(id + 'Binder', [
      ['export interface ', id, 'Data', genFieldsWithBase.make(view.refs.fields, {})],
      ['export type ', id, 'Binder = SingletonBinder<', id, 'Data>'],
      ['export type ', id, 'Instance = SingletonBinding<', id, 'Data>']
    ], false)
  },
}, { compuri: '' })

const genOpInstanceType = nodeTransformer({
  Operation(w, op, info) {
    const id = 'T' + info.cfg.compuri + '_operation_' + op.name.str
    info.src.require('OperationContext', '~/lib/archol/operations', op)
    return w.chipResult(id + 'Exec', [
      ['export interface ', id, 'Input', genFieldsWithType.make(op.input, {})],
      ['export interface ', id, 'Output', genFieldsWithType.make(op.output, {})],
      ['export type ', id, 'Exec = ( input: ', id, 'Input ) => OperationContext<', id, 'Output>'],
    ], false)
  },
}, { compuri: '' })
