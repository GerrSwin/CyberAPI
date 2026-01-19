import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { defineStore } from 'pinia'

import { saveDatabasePath } from '../commands/database'
import { setWindowPosition, setWindowSize } from '../commands/window'

import { LocationQuery, RouteParams } from 'vue-router'
import { loadAppSetting, saveAppSetting } from '../commands/settings'
import { isWebMode } from '../helpers/util'
const appWindow = getCurrentWebviewWindow()

export interface Timeout {
  connect: number
  write: number
  read: number
}

interface AppSetting {
  theme: string
  collectionSortType: string
  collectionColumnWidths: number[]
  dbPath?: string
  resizeType: string
  size: {
    width: number
    height: number
  }
  position?: {
    x: number
    y: number
  }
  latestRoute: {
    name: string
    params: RouteParams
    query: LocationQuery
  }
  timeout: Timeout
}

export enum ResizeType {
  Max = 'max',
  Custom = 'custom',
}

async function getAppSetting(): Promise<AppSetting> {
  const setting = await loadAppSetting<AppSetting>()
  return setting || ({} as AppSetting)
}

function clampPosition(x: number, y: number) {
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
  }
}

function updateAppSetting(data: AppSetting): Promise<AppSetting> {
  return saveAppSetting<AppSetting>(data)
}

export async function updateAppLatestRoute(route: { name: string; params: RouteParams; query: LocationQuery }) {
  const setting = await getAppSetting()
  setting.latestRoute = route
  await updateAppSetting(setting)
}

export async function getAppLatestRoute() {
  const setting = await getAppSetting()
  return setting.latestRoute
}

function isDarkTheme(theme: string) {
  return theme === 'dark'
}

export const useSettingStore = defineStore('common', {
  state: () => {
    return {
      fetching: false,
      theme: '',
      isDark: false,
      systemTheme: '',
      collectionSortType: '',
      collectionColumnWidths: [] as number[],
      dbPath: '',
      resizeType: '',
      size: {
        width: 0,
        height: 0,
      },
      position: null as { x: number; y: number } | null,
      timeout: {
        connect: 0,
        read: 0,
        write: 0,
      },
    }
  },
  actions: {
    async fetch(): Promise<void> {
      if (this.fetching) {
        return
      }
      this.fetching = true
      try {
        // Prefer user settings
        const setting = await getAppSetting()
        let currentTheme = setting.theme || ''
        this.theme = currentTheme
        if (setting.collectionColumnWidths?.length) {
          this.collectionColumnWidths = setting.collectionColumnWidths
        }
        if (!isWebMode()) {
          const result = await appWindow.theme()
          this.systemTheme = (result as string) || ''
          if (!currentTheme) {
            currentTheme = this.systemTheme
          }
        }
        this.isDark = isDarkTheme(currentTheme)
        this.collectionSortType = setting.collectionSortType
        this.dbPath = setting.dbPath || ''

        // If empty
        // Set default value
        if (!this.collectionColumnWidths.length) {
          // Left, middle, and right auto-fill
          const first = 300
          this.collectionColumnWidths = [first, 0.5]
        }
        if (setting.size) {
          this.size = setting.size
        }
        if (setting.position) {
          const clamped = clampPosition(setting.position.x, setting.position.y)
          const positionChanged = clamped.x !== setting.position.x || clamped.y !== setting.position.y
          this.position = clamped
          if (positionChanged) {
            setting.position = clamped
            await updateAppSetting(setting)
          }
        }
        this.resizeType = setting.resizeType || ResizeType.Max
        this.timeout = Object.assign(
          {
            connect: 0,
            write: 0,
            read: 0,
          },
          setting.timeout,
        )
      } catch {
        // Ignore if fetch fails
      } finally {
        this.fetching = false
      }
    },
    async updateTheme(theme: string) {
      const setting = await getAppSetting()
      setting.theme = theme
      await updateAppSetting(setting)
      this.theme = theme
      // If theme is empty, use the system theme
      this.isDark = isDarkTheme(theme || this.systemTheme)
    },
    async updateCollectionSortType(sortType: string) {
      const setting = await getAppSetting()
      setting.collectionSortType = sortType
      await updateAppSetting(setting)
      this.collectionSortType = sortType
    },
    async updateCollectionColumnWidths(widths: number[]) {
      const setting = await getAppSetting()
      setting.collectionColumnWidths = widths
      await updateAppSetting(setting)
      this.collectionColumnWidths = widths
    },
    async updateDbPath(dbPath: string) {
      const setting = await getAppSetting()
      setting.dbPath = dbPath
      await updateAppSetting(setting)
      this.dbPath = dbPath
      await saveDatabasePath(dbPath)
    },
    async updateParamsColumnWidth(width: number) {
      if (width < 0.2 || width > 0.8) {
        return
      }
      const setting = await getAppSetting()
      const widths = setting.collectionColumnWidths.slice(0)
      widths[1] = width
      return this.updateCollectionColumnWidths(widths)
    },
    async updateSize(width: number, height: number) {
      const setting = await getAppSetting()
      setting.size = {
        width,
        height,
      }
      await updateAppSetting(setting)
      this.size = {
        width,
        height,
      }
    },
    async updatePosition(x: number, y: number) {
      const setting = await getAppSetting()
      const position = clampPosition(x, y)
      setting.position = position
      await updateAppSetting(setting)
      this.position = position
    },
    async updateResizeType(resizeType: string) {
      const setting = await getAppSetting()
      setting.resizeType = resizeType
      await updateAppSetting(setting)
      this.resizeType = resizeType
    },
    async resize() {
      const { width, height } = this.size
      if (this.resizeType === ResizeType.Max) {
        await setWindowSize(-1, -1)
      } else if (width > 0 && height > 0) {
        await setWindowSize(width, height)
      }
    },
    async restoreWindowPosition() {
      if (this.resizeType === ResizeType.Max || !this.position) {
        return
      }
      const { x, y } = this.position
      await setWindowPosition(x, y)
    },
    getRequestTimeout() {
      return this.timeout
    },
    async updateRequestTimeout(params: Timeout) {
      const setting = await getAppSetting()
      setting.timeout = params
      await updateAppSetting(setting)
      this.timeout = setting.timeout
    },
  },
})
