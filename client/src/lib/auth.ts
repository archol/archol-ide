import { ArcholDoc, EMPTY } from './archol';
import React from 'react'

export interface AuthData {
    uid: string
    name: string
    photo: string
    emails: string[]
    roles: string[]
}

export const authDoc: ArcholDoc<AuthData> = {
    async open() {
        return EMPTY
    },
    release() {

    },
    use() {
        const [s] = React.useState(EMPTY)
        return s
    }
}