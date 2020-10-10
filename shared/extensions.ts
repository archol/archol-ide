
export function mapObject<T, R>(obj: { [name: string]: T }, fn: (propVal: T, propName: keyof T) => R): { [name: string]: R } {
    const ret: { [name: string]: R } = {}
    Object.keys(obj).forEach((propName: any) => {
        const propVal = obj[propName]
        const retVal = fn(propVal, propName)
        ret[propName] = retVal
    })
    return ret
}

export function mapObjectToArray<T, R>(obj: { [name: string]: T }, fn: (propVal: T, propName: keyof T) => R): R[] {
    return Object.keys(obj).map((propName: any) => fn(obj[propName], propName))
}

export function cloneObject<T>(obj: T): T {
    if (typeof obj === 'undefined') return undefined as any as T
    if (obj === null) return null as any as T
    if (Array.isArray(obj))
        return (obj as any).map(cloneObject)
    if (typeof obj === 'function')
        return obj as any as T
    if (typeof obj !== 'object')
        return obj as any as T
    if (obj instanceof Date)
        return new Date(obj.getTime() as any) as any
    const n: any = {}
    Object.keys(obj).forEach(function each(prop) {
        n[prop] = cloneObject((obj as any)[prop])
    })
    return n
}

export function compareObj(a: any, b: any, allProperties: boolean): number {
    const ta = a === null ? 'null' : typeof a
    const tb = b === null ? 'null' : typeof b
    let r
    if (ta !== tb) {
        if (ta === 'undefined') return -1
        if (tb === 'undefined') return 1
        return (ta < tb) ? -1 : 1
    } else if (a instanceof Date) {
        if (b instanceof Date) return a.getTime() - b.getTime()
        return ('Date' < tb) ? -1 : 1
    } else if (Array.isArray(a)) {
        r = a.length - b.length
        if (!r)
            a.some((va, idx) => {
                r = compareObj(va, b[idx], allProperties)
                return r as any as boolean
            })
        return r
    } else if (ta === 'object') {
        const keysA = Object.keys(a)
        keysA.sort()
        r = 0
        keysA.some((prop) => {
            r = compareObj(a[prop], b[prop], allProperties)
            return r as any as boolean
        })
        if (r === 0 && allProperties) r = keysA.length - Object.keys(b).length
        return r
    } else if (ta === 'function') {
        return 0
    } else {
        if (a === b) return 0
        return (a < b) ? -1 : 1
    }
}

export function merge<A, B>(a: A, b: B): A & B {
    b && Object.getOwnPropertyNames(b).forEach((p) => (a as any)[p] = (b as any)[p])
    return a as any
}
