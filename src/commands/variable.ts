import dayjs from 'dayjs'
import { ulid } from 'ulid'
import { isWebMode } from '../helpers/util'
import { fakeAdd, fakeList, fakeUpdate, fakeUpdateStore } from './fake'
import { cmdAddVariable, cmdDeleteVariable, cmdListVariable, cmdUpdateVariable, run } from './invoke'

const store = 'variables'

export enum VariableStatus {
  Enabled = '1',
  Disabled = '0',
}

export enum VariableCategory {
  // Environment variables
  Environment = 'env',
  // Custom
  Customize = 'customize',
  // Global request headers
  GlobalReqHeaders = 'globalReqHeaders',
}

export interface Variable {
  [key: string]: unknown
  id: string
  category: string
  collection: string
  environment?: string
  // Name
  name: string
  // Value
  value: string
  // Enabled (0: disabled, 1: enabled)
  enabled: string
  // Created at
  createdAt: string
  // Updated at
  updatedAt: string
}

export function newDefaultVariable(): Variable {
  const id = ulid()
  return {
    id,
    category: '',
    collection: '',
    environment: '',
    name: '',
    value: '',
    enabled: VariableStatus.Enabled,
    createdAt: dayjs().format(),
    updatedAt: dayjs().format(),
  }
}

export async function createVariable(value: Variable) {
  if (isWebMode()) {
    await fakeAdd<Variable>(store, value)
  }
  await run(cmdAddVariable, {
    value,
  })
}

export async function listVariable(collection: string, category: string): Promise<Variable[]> {
  if (isWebMode()) {
    return await fakeList<Variable>(store)
  }
  return await run<Variable[]>(cmdListVariable, {
    collection,
    category,
  })
}

export async function updateVariable(value: Variable) {
  if (isWebMode()) {
    return await fakeUpdate(store, value)
    return
  }
  await run(cmdUpdateVariable, {
    value,
  })
}

export async function deleteVariable(ids: string[]) {
  if (isWebMode()) {
    const arr = await fakeList<Variable>(store)
    const result = arr.filter((item) => {
      return !ids.includes(item.id)
    })
    await fakeUpdateStore(store, result)
  }
  await run(cmdDeleteVariable, {
    ids,
  })
}
