
export type EMPTY = "EMPTY(1)"
export const EMPTY: EMPTY = 1 as any
export type LOADING = "LOADING(2)"
export const LOADING: LOADING = 2 as any

export interface ArcholDoc<T extends object> {
    readonly loading: boolean
    open(id: string): Promise<T | EMPTY>
    openAll(): Promise<LOADING | T[]>
    release(): void
    use(id: string): LOADING | EMPTY | T
    useAll(): LOADING | T[]
}
