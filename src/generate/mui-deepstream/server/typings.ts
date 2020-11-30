
import { nodeTransformer, sourceTransformer } from 'generate/lib/generator'
import { genFieldsWithBase, genFieldsWithType } from '../common/fields'
import { genUseType } from '../common/useType'

export const generateServerTypings = sourceTransformer({
  filePath: '~/app/typings.ts',
  cfg: {},
  transformations: {
    Application(w, app, { src }) {
      return w.statements([
        ['export interface AppRef ', app.uses],
        'export type Tstring=string',
        'export type Tnumber=number',
        'export type Tboolean=boolean',
        'export type Tdate=number',
      ], false)
    },
    ComponentUses(w, comps) {
      return [w.mapObj(comps, (val, key) => val)]
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
    const id = 'T' + compuri + 'Ref'
    return w.chipResult(id, [
      ['export interface ' + id,
      w.object({
        type: w.mapObj(comp.types, (val, key) =>
          ['T', val.nodeMapping.uri]
        ),
        document: w.mapObj(comp.documents, (val) =>
          src.chip(10, genDocType.make(val, { compuri }))
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
      })]
    ], false)
  },
}, {})

const genDocType = nodeTransformer({
  Document(w, doc, info) {
    const doct = 'T' + doc.nodeMapping.uri()
    return w.chipResult(doct, [
      ['export interface ', doct,
        w.mapObj(doc.primaryFields.merge(doc.secondaryFields), (f) => {
          return 'T' + f.type.base(f)
        })
      ],
    ], false)
  },
  DocField(w, doc, { src, cfg }) {
    return [doc.name.str, ':', doc.type]
  },
  ...genUseType.transformerFactory,
}, { compuri: '' })

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
