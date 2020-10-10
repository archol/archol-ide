import { DeepstreamClient } from '@deepstream/client'

export const wsPath = '/home/thr0w/projects/appcvv'

const deepstreamOptions = {
  reconnectIntervalIncrement: 10000,
  maxReconnectInterval: 30000,
  maxReconnectAttempts: Infinity,
  heartbeatInterval: 60000
};

export const deepstreamClient = new DeepstreamClient('wss://app.cvv.org.br', deepstreamOptions)
  deepstreamClient.login({ username: 'chris', password: 'server' }, function () {
})
