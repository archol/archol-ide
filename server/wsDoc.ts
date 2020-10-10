import { existsSync, readFileSync, watchFile, writeFileSync } from 'fs'
import { ArcholApplication, ArcholPackage, ArcholWorkspace } from './archolTypes'
import { buildApp } from './build'
import { deepstreamClient } from './dreamstream'

export let wsData: ArcholWorkspace = {
  apps: [],
  pkgs: [],
}

let tmChanged: any
let needSave = false
const wsFile = __dirname + '/cvv.ws.archol'

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
      writeFileSync(wsFile, JSON.stringify(wsData, null, 2), 'utf-8')
      needSave = false
      wsDoc.emit()
      setTimeout(() => buildApp('archol', wsData), 1)
      setTimeout(() => buildApp('appcvv', wsData), 1)
      tmChanged = false
    }, 800)
  },
  save() {
    needSave = true;
    wsDoc.changed()
  },
  load() {
    if (existsSync(wsFile)) {
      const src = readFileSync(wsFile, 'utf-8')
      wsData = JSON.parse(src)
      wsDoc.changed()
    }
  },
  createApplication(name: string) {
    const app: ArcholApplication = { name }
    wsDoc.data.apps.push(app)
    wsDoc.save()
    return app
  },
  createPackage(name: string) {
    const pkg: ArcholPackage = { name }
    wsDoc.data.pkgs.push(pkg)
    wsDoc.save()
    return pkg
  },
}

setTimeout(() => {
  wsDoc.load()
  watchFile(wsFile, (curr, prev) => {
    wsDoc.load()
  });
}, 100)

deepstreamClient.rpc.provide('archol.ws$load', async (rpcData, res) => {
  wsDoc.emit()
  res.send(true)
})

deepstreamClient.rpc.provide('archol.ws$createApplication', async (rpcData, res) => {
  const name: any = rpcData.name
  wsDoc.createApplication(name)
  res.send(name)
})

deepstreamClient.rpc.provide('archol.ws$createPackage', async (rpcData, res) => {
  const name: any = rpcData.name
  wsDoc.createPackage(name)
  res.send(name)
})
