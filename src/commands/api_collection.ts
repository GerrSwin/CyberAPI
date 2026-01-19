import dayjs from 'dayjs'
import { ulid } from 'ulid'

import { isWebMode } from '../helpers/util'
import { fakeAdd, fakeDeleteAPICollection, fakeList, fakeUpdate } from './fake'
import { cmdAddAPICollection, cmdDeleteAPICollection, cmdListAPICollection, cmdUpdateAPICollection, run } from './invoke'

const store = 'apiCollections'

export interface APICollection {
  [key: string]: unknown
  id: string
  // Name
  name: string
  // Description
  description: string
  // Created at
  createdAt: string
  // Updated at
  updatedAt: string
}

export function newDefaultAPICollection(): APICollection {
  const id = ulid()
  return {
    id,
    name: '',
    description: '',
    createdAt: dayjs().format(),
    updatedAt: dayjs().format(),
  }
}

export async function createAPICollection(collection: APICollection): Promise<void> {
  if (isWebMode()) {
    await fakeAdd<APICollection>(store, collection)
    return
  }
  await run(cmdAddAPICollection, {
    collection,
  })
}

export async function listAPICollection(): Promise<APICollection[]> {
  if (isWebMode()) {
    return await fakeList<APICollection>(store)
  }
  return await run<APICollection[]>(cmdListAPICollection)
}

export async function updateAPICollection(collection: APICollection) {
  if (isWebMode()) {
    await fakeUpdate(store, collection)
    return
  }
  await run(cmdUpdateAPICollection, {
    collection,
  })
}

export async function deleteAPICollection(id: string) {
  if (isWebMode()) {
    await fakeDeleteAPICollection(store, id)
  }
  await run(cmdDeleteAPICollection, {
    id,
  })
}
