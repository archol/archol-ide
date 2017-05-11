
declare interface Object {
    EMPTY: any
    clone<T>(this: T): T
    compare<T>(this: T, o: T, allProperties: boolean): number
    merge<T, O>(this: T, o: O): T & O
}

Object.prototype.EMPTY = {}
Object.prototype.clone = function cloneIt<T>(this: T): T {
    return cloneObject<T>(this)
}
Object.prototype.compare = function compareIt<T>(this: T, o: T, allProperties: boolean): number {
    return compareObj(this, o, allProperties)
}

Object.prototype.merge = function mergeit<T, O>(this: T, o: O): T & O {
    return mergeObj(this, o);
}

function cloneObject<T>(obj: T): T {
    if (typeof obj === 'undefined') return undefined
    if (obj === null) return null
    if (Array.isArray(obj))
        return (obj as any).map(cloneObject)
    if (typeof obj === 'function')
        return obj
    if (typeof obj !== 'object')
        return obj
    if (obj instanceof Date)
        return new Date(obj.getTime() as any) as any
    const n: any = {}
    Object.keys(obj).forEach(function each(prop) {
        n[prop] = cloneObject((obj as any)[prop])
    })
    return n
}

function compareObj(a: any, b: any, allProperties: boolean): number {
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

function mergeObj(a: any, b: any): any {
    b && Object.getOwnPropertyNames(b).forEach((p) => a[p] = b[p])
    return a as any
}
