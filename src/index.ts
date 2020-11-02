import { watch } from 'chokidar'
import { generateApp } from './generate'
import { generateDeclaration } from './generate/wsdecl'
import { loadWorkspace } from './load'
import { debounce } from './utils'
import notifier from 'node-notifier'

const build = debounce(async function build() {
  const workspacePath = process.argv[2]
  const appName = process.argv[3]
  notifier.notify({
    title: 'Archol',
    message: 'Gerando: '+appName
  })
  console.log('Gerando aplicação "' + appName + '" na área de trabalho "' + workspacePath + '"')
  try {
    const ws = await loadWorkspace(workspacePath)
    const app = await ws.loadApp(appName)

    await Promise.all([
      generateDeclaration(ws),
      generateApp(ws, app)
    ])

    const diags=Object.keys(ws.diagnostics)
    diags.forEach((m) => {
      const d = ws.diagnostics[m]
      console.log(
        'diagnostic:',
        d.kind,
        d.sourceRefs.map((s) => [s.file + ':' + s.start.row + ':' + s.start.col]).join(';'),
        m
      )      
      console.log('  ' + (d.archol.stack || d.archol).toString())
    })
    if (diags.length)notifier.notify({
      title: 'Archol',
      message: 'ERRO'
    })
    else notifier.notify({
      title: 'Archol',
      message: 'OK'
    })
    console.log('---')
  } catch (e) {    
    console.log('--- FALHA', e)
    notifier.notify({
      title: 'Archol',
      message: 'FALHA: '+e.message
    })
  }
}, 700)

watch(process.argv[2] + '/ws', {
  ignored: '**/decl.d.ts'
}).on('all', () => build())

setTimeout(build, 1)