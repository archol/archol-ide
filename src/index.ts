import { watch } from 'chokidar'
import { generateApp } from './generate'
import { debounce } from './utils'

const build = debounce(function build() {
  console.log('Gerando aplicação "' + process.argv[3] + '" na área de trabalho "' + process.argv[2] + '"')
  return generateApp(process.argv[2], process.argv[3])
}, 700)

watch(process.argv[2] + '/ws', {
  ignored: 'decl.d.ts'
}).on('all', () => build())

setTimeout(build, 1)