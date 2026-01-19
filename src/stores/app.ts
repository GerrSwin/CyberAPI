import { getTauriVersion, getVersion } from '@tauri-apps/api/app'
import { appDataDir } from '@tauri-apps/api/path'
import { arch, platform, type, version } from '@tauri-apps/plugin-os'
import { defineStore } from 'pinia'

import { getUserAgent } from '../commands/http_request'
import { isWebMode } from '../helpers/util'

export const useAppStore = defineStore('app', {
  state: () => {
    return {
      version: '--',
      tauriVersion: '--',
      arch: '--',
      platform: '--',
      os: '--',
      osVersion: '--',
      dir: '--',
      userAgent: '--',
    }
  },
  actions: {
    async fetch() {
      if (!isWebMode()) {
        this.version = await getVersion()
        this.tauriVersion = await getTauriVersion()
        this.arch = await arch()
        this.platform = await platform()
        this.os = await type()
        this.osVersion = await version()
        this.dir = await appDataDir()
        this.userAgent = await getUserAgent()
      }
    },
  },
})
