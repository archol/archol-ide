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

    console.log('---')
  } catch (e) {
    console.log('--- ERRO')
  }
}, 700)

watch(process.argv[2] + '/ws', {
  ignored: '**/decl.d.ts'
}).on('all', () => build())

setTimeout(build, 1)