import dayjs from 'dayjs'
import { ulid } from 'ulid'

import { isWebMode } from '../helpers/util'
import { fakeAdd, fakeList, fakeUpdate, fakeUpdateStore } from './fake'
import { cmdAddAPISetting, cmdDeleteAPISettings, cmdListAPISetting, cmdUpdateAPISetting, run } from './invoke'

const store = 'apiSettings'

export interface APISetting {
  [key: string]: unknown
  id: string
  collection: string
  // Name
  name: string
  // Type (http, graphQL)
  category: string
  // Config
  setting: string
  // Created at
  createdAt: string
  // Updated at
  updatedAt: string
}

export function newDefaultAPISetting(): APISetting {
  const id = ulid()
  return {
    id,
    collection: '',
    name: '',
    category: '',
    setting: '',
    createdAt: dayjs().format(),
    updatedAt: dayjs().format(),
  }
}

export async function createAPISetting(setting: APISetting): Promise<void> {
  if (isWebMode()) {
    await fakeAdd<APISetting>(store, setting)
    return
  }
  if (!setting.id) {
    setting.id = ulid()
  }
  try {
    await run(cmdAddAPISetting, {
      setting,
    })
  } catch (err) {
    let catchError = false
    if (err instanceof Error) {
      const message = err.message
      if (message.includes('seaOrm') && message.includes('UNIQUE constraint failed')) {
        catchError = true
        setting.id = ulid()
        await run(cmdAddAPISetting, {
          setting,
        })
      }
    }
    if (!catchError) {
      throw err
    }
  }
}

export async function listAPISetting(collection: string): Promise<APISetting[]> {
  if (isWebMode()) {
    const settings = await fakeList<APISetting>(store)
    return settings.filter((item) => item.collection === collection)
  }
  return await run<APISetting[]>(cmdListAPISetting, {
    collection,
  })
}

export async function updateAPISetting(setting: APISetting) {
  if (isWebMode()) {
    await fakeUpdate(store, setting)
    return
  }
  await run(cmdUpdateAPISetting, {
    setting,
  })
}

export async function deleteAPISettings(ids: string[]) {
  if (isWebMode()) {
    const arr = await fakeList<APISetting>(store)
    const result = arr.filter((item) => {
      return !ids.includes(item.id)
    })
    await fakeUpdateStore(store, result)
  }
  await run(cmdDeleteAPISettings, {
    ids,
  })
}
