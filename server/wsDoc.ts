import { existsSync, readFileSync, watchFile, writeFileSync } from 'fs'
import { ArcholApplication, ArcholPackage, ArcholWorkspace } from './archolTypes'
import { generateApp } from './generate'
import { deepstreamClient } from './dreamstream'

export let wsData: ArcholWorkspace = {
  node: {
    kind: 'workspace'
  },
  apps: [],
  pkgs: [],
}

let tmChanged: any
let oldWsData: ArcholWorkspace
let needSave = false
const wsFile = __dirname + '/../cvv.ws.archol.json'

export const wsDoc = {
  get data() {
    return wsData
  },
  emit() {
    deepstreamClient.event.emit('archol.ws.changed', wsData as any)
  },
  changed() {
    if (tmChanged) clearTimeout(tmChanged)
    tmChanged = setTimeout(() => {
      if (needSave) {
        try {
          console.log('gravando')
          writeFileSync(wsFile, JSON.stringify(wsData, null, 2), 'utf-8')
        } catch (e) {
          console.log('ws.load', e)
        }
      }
      needSave = false
      tmChanged = false
    }, 800)
  },
  save() {
    needSave = true;
    wsDoc.changed()
  },
  load() {
    try {
      if (existsSync(wsFile)) {
        console.log('carregando')
        const src = readFileSync(wsFile, 'utf-8')
        wsData = JSON.parse(src)
        needSave = false;
        wsDoc.emit()
      }
    } catch (e) {
      console.log('ws.load', e)
    }
  },
  // createApplication(app: ArcholApplication) {
  //   //wsDoc.data.apps.push(app)
  //   //wsDoc.save()
  // },
  // createPackage(name: string) {
  //   const pkg: ArcholPackage = { name }
  //   //wsDoc.data.pkgs.push(pkg)
  //   //wsDoc.save()
  //   return pkg
  // },
}

setTimeout(() => {
  loadAndGenerate()
  watchFile(wsFile, (curr, prev) => loadAndGenerate);
  function loadAndGenerate() {
    wsDoc.load()
    //setTimeout(() => buildApp('archol', wsData), 1)
    setTimeout(() => generateApp('appcvv', wsData), 1)
  }
}, 100)

deepstreamClient.rpc.provide('archol.ws$load', (rpcData, res) => {
  wsDoc.emit()
  res.send(true)
})

// deepstreamClient.rpc.provide('archol.ws$createApplication', (rpcData, res) => {
//   const name: any = rpcData.name
//   wsDoc.createApplication(name)
//   res.send(name)
// })

// deepstreamClient.rpc.provide('archol.ws$createPackage', (rpcData, res) => {
//   const name: any = rpcData.name
//   wsDoc.createPackage(name)
//   res.send(name)
// })
