export interface DeferredPromise<T> {
  promise: Promise<T>
  resolve(value: T | PromiseLike<T> | undefined): void
  reject(reason: any): void
}

export function deferPromise<T>() {
  const self: DeferredPromise<T> = {
    promise: undefined as any,
    resolve(value) {
      setTimeout(() => self.resolve(value), 1)
    },
    reject(reason) {
      setTimeout(() => self.reject(reason), 1)
    }
  }
  self.promise = new Promise<T>((fn_resolve, fn_reject) => {
    self.resolve = fn_resolve
    self.reject = fn_reject
  })
  return self
}

export async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function asap(fn: () => void) {
  setTimeout(() => fn(), 1)
}

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

export function debounce<T extends Function>(fn: T, timeout: number) {
  let timer: any
  return debouncefn as any as T
  function debouncefn(this: any) {
    const obj = this
    const args = arguments
    if (timer) { clearTimeout(timer) }
    timer = setTimeout(() => {
      timer = null
      fn.apply(obj, args)
    }, timeout)
  }
}