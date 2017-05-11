
import http = require('http');
import url = require('url');
import WebSocket = require('ws');
import { server } from './http'
import { emitterProxyHandler } from './msgEmitter'

export const wss = new WebSocket.Server({
    server,
    perMessageDeflate: false
});

wss.on('connection', function connection(ws) {
    debugger
    const proxy = createServerProxy(ws)

    ws.on('message', function incoming(message) {
        proxy.receive(message)
    });

    proxy.service.emit.boot()
});

function createServerProxy(ws: WebSocket) {

    const context = {
        _ws: ws,
        _location: url.parse(ws.upgradeReq.url, true)
    }.merge(null as ArcholIdeService)
        .merge(null as ArcholIdeMessaging)

    context.emit = new Proxy(context as ArcholIdeMessaging, emitterProxyHandler)
    context.listen = new Proxy(context, notAllowedProxy)

    return {
        receive(message: any) {
            console.dir({
                message,
                token: context._location.query.access_token
            });
        },
        service: context as ArcholIdeService
    }
}

let notAllowedProxy: ProxyHandler<any> = {
    get(target: any, p: PropertyKey, receiver: any): any {
        throw new Error('not allowed')
    }
}