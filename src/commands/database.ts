import { getVersion } from '@tauri-apps/api/app'
import { message } from '@tauri-apps/plugin-dialog'
import dayjs from 'dayjs'
import { ulid } from 'ulid'

import { isWebMode } from '../helpers/util'
import { cmdAddVersion, cmdExportTables, cmdGetLatestVersion, cmdImportTables, cmdInitTables, cmdSetDbPath, run } from './invoke'
import { loadAppSetting } from './settings'

export interface Version {
  [key: string]: unknown
  id: string
  version: string
  createdAt: string
  updatedAt: string
}

async function getDatabaseLatestVersion() {
  if (isWebMode()) {
    return {} as Version
  }
  return await run<Version>(cmdGetLatestVersion, {})
}

async function getStoredDbPath(): Promise<string> {
  const setting = await loadAppSetting<{ dbPath?: string }>()
  return setting?.dbPath || ''
}

export async function syncDatabasePath() {
  if (isWebMode()) {
    return
  }
  const dbPath = await getStoredDbPath()
  await run(cmdSetDbPath, {
    path: dbPath || '',
  })
}

// handleDatabaseCompatible handles database compatibility
export async function handleDatabaseCompatible() {
  if (isWebMode()) {
    return
  }
  try {
    await syncDatabasePath()
    await run(cmdInitTables)
    const version = await getVersion()
    const latestVersion = await getDatabaseLatestVersion()
    if (!latestVersion || latestVersion.version !== version) {
      await run(cmdAddVersion, {
        version: {
          id: ulid(),
          version,
          createdAt: dayjs().format(),
          updatedAt: dayjs().format(),
        },
      })
    }
    // TODO add database updates later
  } catch (err) {
    if (err instanceof Error) {
      message(err.message)
    }
    console.error(err)
  }
}

export async function exportTables(): Promise<string> {
  return await run(cmdExportTables)
}

export async function importTables(file: string) {
  return await run(cmdImportTables, {
    file,
  })
}

export async function saveDatabasePath(path: string) {
  if (isWebMode()) {
    return
  }
  await run(cmdSetDbPath, {
    path: path || '',
  })
}
