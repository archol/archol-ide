
import { worker } from './worker'

worker.postMessage('')

console.log('client=', new Date().toDateString())  