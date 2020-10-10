import dom from 'react-dom'
import React from 'react'
import { deactivateBusy } from './lib/appbusy'
import { authDoc } from './lib/auth'
import { declareDocGlobal, EMPTY, LOADING } from './lib'

const appsDoc = declareDocGlobal<{ name: string, lang: string, uses: string[] }>('app')
// const pkgsDoc = declareDocGlobal('pkg')

function ListApps() {
    const apps = appsDoc.useAll()
    if (apps === LOADING) return <div>loading</div>
    return <li>
        {apps.map((a) => (
            <li>{a.name}</li>
        ))}
    </li>

}
async function boot() {
    await authDoc.openAll()
    deactivateBusy()
    dom.render(
        <ListApps />,
        document.querySelector('#root')
    )
}

setTimeout(boot, 5000)