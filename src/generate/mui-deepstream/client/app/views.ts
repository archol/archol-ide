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
        debugger
        transformFile(pkg.uri.id.str+'/views/'+v.key.str+'.tsx', genView.make(v.val, {pkguri}))
      })
      return ''
    },  
}})

const genView = nodeTransformer({
  View(w, v, {src}) {

    src.require('ArcholView', '../../lib/archol/types', v)
    const fields=v.refs.fields
    return w.statements([
      [
        'export function View'+v.name.str, w.funcDecl(
          fields.items.length?
          ['{ proc }: {vars: cvv_org_br_dashboard_bemvindoInstance }']:[], 
          'ArcholView', [

          ]
        )    
      ]
    ], false)                
  },  
}, {pkguri: ''})
