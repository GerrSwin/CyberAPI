import dayjs from 'dayjs'
import { ulid } from 'ulid'
import { isWebMode } from '../helpers/util'
import { fakeAdd, fakeDeleteItems, fakeList, fakeUpdate } from './fake'
import { cmdAddProxy, cmdDeleteProxy, cmdListProxy, cmdUpdateProxy, run } from './invoke'

const store = 'proxies'

export enum ProxyMode {
  Include = 'include',
  Exclude = 'exclude',
}

export enum ProxyStatus {
  Disabled = '0',
  Enabled = '1',
}

export interface ProxySetting {
  id: string
  proxy: string
  list: string
  mode: ProxyMode
  enabled: ProxyStatus | string
  createdAt: string
  updatedAt: string
}

export function newDefaultProxySetting(): ProxySetting {
  const id = ulid()
  return {
    id,
    proxy: '',
    list: '',
    mode: ProxyMode.Include,
    enabled: ProxyStatus.Enabled,
    createdAt: dayjs().format(),
    updatedAt: dayjs().format(),
  }
}

export async function createProxy(proxy: ProxySetting) {
  if (isWebMode()) {
    await fakeAdd<ProxySetting>(store, proxy)
  }
  await run(cmdAddProxy, {
    proxy,
  })
}

export async function listProxy(): Promise<ProxySetting[]> {
  if (isWebMode()) {
    return await fakeList<ProxySetting>(store)
  }
  return await run<ProxySetting[]>(cmdListProxy)
}

export async function updateProxy(proxy: ProxySetting) {
  if (isWebMode()) {
    await fakeUpdate(store, proxy)
    return
  }
  await run(cmdUpdateProxy, {
    proxy,
  })
}

export async function deleteProxy(ids: string[]) {
  if (isWebMode()) {
    await fakeDeleteItems<ProxySetting>(store, ids)
  }
  await run(cmdDeleteProxy, {
    ids,
  })
}
