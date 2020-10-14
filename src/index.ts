import { watch } from 'chokidar'
import { generateApp } from './generate'
import { generateDeclaration } from './generate/wsdecl'
import { loadWorkspace } from './load'
import { debounce } from './utils'

const build = debounce(async function build() {
  const workspacePath = process.argv[2]
  const appName = process.argv[3]
  console.log('Gerando aplicação "' + appName + '" na área de trabalho "' + workspacePath + '"')
  try {
    const ws = await loadWorkspace(workspacePath)
    const app = await ws.loadApp(appName)

    await Promise.all([
      generateDeclaration(ws),
      generateApp(ws, app)
    ])

    Object.keys(ws.diagnostics).forEach((m) => {
      const d = ws.diagnostics[m]
      console.log(d.kind, d.sourceRef.file + ':' + d.sourceRef.start.row + ':' + d.sourceRef.start.col, m)
      console.log('  ' + (d.archol.stack || d.archol).toString())
    }
    )
    console.log('---')
  } catch (e) {
    console.log('--- ERRO', e)
  }
}, 700)

watch(process.argv[2] + '/ws', {
  ignored: '**/decl.d.ts'
}).on('all', () => build())

setTimeout(build, 1)