import dayjs from 'dayjs'
import { ulid } from 'ulid'
import { isWebMode } from '../helpers/util'
import { fakeAdd, fakeDeleteItems, fakeList, fakeUpdate } from './fake'
import { cmdAddEnvironment, cmdDeleteEnvironment, cmdListEnvironment, cmdUpdateEnvironment, run } from './invoke'

const store = 'environments'

export enum EnvironmentStatus {
  Enabled = '1',
  Disabled = '0',
}

export interface Environment {
  [key: string]: unknown
  id: string
  collection: string
  name: string
  enabled: string
  createdAt: string
  updatedAt: string
}

export function newDefaultEnvironment(): Environment {
  const id = ulid()
  return {
    id,
    collection: '',
    name: '',
    enabled: EnvironmentStatus.Disabled,
    createdAt: dayjs().format(),
    updatedAt: dayjs().format(),
  }
}

export async function createEnvironment(value: Environment) {
  if (isWebMode()) {
    await fakeAdd<Environment>(store, value)
  }
  await run(cmdAddEnvironment, {
    value,
  })
}

export async function listEnvironment(collection: string): Promise<Environment[]> {
  if (isWebMode()) {
    return await fakeList<Environment>(store)
  }
  return await run<Environment[]>(cmdListEnvironment, {
    collection,
  })
}

export async function updateEnvironment(value: Environment) {
  if (isWebMode()) {
    return await fakeUpdate(store, value)
  }
  await run(cmdUpdateEnvironment, {
    value,
  })
}

export async function deleteEnvironment(ids: string[]) {
  if (isWebMode()) {
    await fakeDeleteItems<Environment>(store, ids)
  }
  await run(cmdDeleteEnvironment, {
    ids,
  })
}
