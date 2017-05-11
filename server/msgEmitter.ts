

export let emitter: ArcholIdeMessaging = {
    async boot() {
        return new Date().getTime()
    }
}


export const emitterProxyHandler: ProxyHandler<ArcholIdeMessaging> = {
    get(target: ArcholIdeMessaging, p: keyof ArcholIdeMessaging, receiver: any): any {
        let r: any = target[p]
        if (!r) {
            r = function send() {
                return (emitter[p] as Function).apply(target, arguments)
            }
            target[p] = r as any
        }
        return r
    }
}

