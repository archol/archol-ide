import { DeepstreamClient } from '@deepstream/client'
import { ArcholDoc } from './archol'

const deepstreamOptions = {
  reconnectIntervalIncrement: 10000,
  maxReconnectInterval: 30000,
  maxReconnectAttempts: Infinity,
  heartbeatInterval: 60000,
  offlineEnabled: true,
  debug: true
};

const client = new DeepstreamClient('wss://app.cvv.org.br', deepstreamOptions)

interface Loading {
  sub: any
  using: boolean
  last: any
  open: Promise<any>
}
let loading: {
  [id: string]: Loading
} = {}

export function declareDocGlobal<T extends object>(col: string): ArcholDoc<T> {
  const ret: ArcholDoc<T> = {
    async open(id: string) {
      const lstr = col + '.' + id
      let l = loading[lstr]
      if (!l) {
        const res = await client.rpc.make('archol.opendoc', { col, id })
        l = loading[lstr] = {
          sub: client.event.subscribe(lstr + '$changed', (data: any) => {

          }),
          using: true,
          last: undefined
        }
      }
    }
  }
}