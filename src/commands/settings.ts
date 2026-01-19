import { isWebMode } from '../helpers/util'
import { getSettingStore } from '../stores/local'
import { cmdClearSettings, cmdGetSettings, cmdSaveSettings, run } from './invoke'

const appSettingKey = 'app'

export async function loadAppSetting<T>(): Promise<T | undefined> {
  if (isWebMode()) {
    const setting = await getSettingStore().getItem<T>(appSettingKey)
    return setting ?? undefined
  }
  const result = await run<T | null>(cmdGetSettings)
  return result ?? undefined
}

export async function saveAppSetting<T>(setting: T): Promise<T> {
  if (isWebMode()) {
    await getSettingStore().setItem(appSettingKey, setting)
    return setting
  }
  await run(cmdSaveSettings, { setting })
  return setting
}

export async function clearAppSetting(): Promise<void> {
  if (isWebMode()) {
    await getSettingStore().removeItem(appSettingKey)
    return
  }
  await run(cmdClearSettings)
}
