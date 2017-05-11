function createServerProxy(ws: WebSocket) {

    const context = {
        _ws: ws,
        _location: url.parse(ws.upgradeReq.url, true)
    }.merge(null as ArcholIdeMessaging)

    context.emit = new Proxy(context as ArcholIdeMessaging, emitterProxy)
    context.on = new Proxy(context, notAllowedProxy)
    context.off = new Proxy(context, notAllowedProxy)
    context.once = new Proxy(context, notAllowedProxy)

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

const emitterProxy: ProxyHandler<ArcholIdeMessaging> = {
    get(target: any, p: PropertyKey, receiver: any): any {
        let r: any = target[p]
        if (!r) {
            r = target[p] = function send() {
                target
            }
        }
    }
}
