import { resolve, join } from 'path'

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

export function mergeObjWith<T0, T1 extends Object>(a: T0, b: T1): T0 & T1;
export function mergeObjWith<T0, T1 extends Object, T2 extends Object>(a: T0, b: T1, c: T2): T0 & T1 & T2;
export function mergeObjWith<T0, T1 extends Object, T2 extends Object, T3 extends Object>(a: T0, b: T1, c: T2, d: T3): T0 & T1 & T2 & T3;
export function mergeObjWith(...objs: any[]) {
  let r: any = {}
  for (let i = 0; i < objs.length; i++) {
    if (typeof objs[i] === "function") {
      r = objs[i]
      objs.splice(i, 1)
      break
    }
  }
  objs.forEach((obj) => {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      r[prop] = obj[prop]
    })
  })
  return r
}

export function tildeExpand(src: string, imp: string) {
  if (!imp.startsWith("~/")) return imp;
  const srcparts = src.split("/");
  const impparts = imp.split("/");
  deleteStart();
  if (imp.startsWith("~/app/") || imp.startsWith("~/test/")) {
    let s1 = new Array(srcparts.length - 1).fill("../").join("").trim();
    const t1 = join(s1, impparts.join('/'));
    return s1 ? t1 : './' + t1
  }
  const s2 = new Array(srcparts.length - 1).fill("../").join("");
  const t2 = join(s2, imp.replace("~/", ""));
  return t2;
  function deleteStart() {
    let i = 0;
    while (
      i < srcparts.length &&
      i < impparts.length &&
      srcparts[i] === impparts[i]
    ) {
      i++;
    }
    srcparts.splice(0, i);
    impparts.splice(0, i);
  }
}

export function parseArcholDate(str: string) {
  if (str) return new Date(str).toISOString()
  return new Date().toISOString()
}