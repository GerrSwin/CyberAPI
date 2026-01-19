import { hide } from '@tauri-apps/api/app'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isMacOS, isWebMode } from './helpers/util'
import { ResizeType, useSettingStore } from './stores/setting'
const appWindow = getCurrentWebviewWindow()

export async function initWindowEvent() {
  if (isWebMode()) {
    return
  }
  const settingStore = useSettingStore()
  if (await isMacOS()) {
    appWindow.onCloseRequested((e) => {
      e.preventDefault()
      hide()
    })
  }

  const debounceMs = 200
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  let moveTimer: ReturnType<typeof setTimeout> | null = null

  await appWindow.onResized(({ payload }) => {
    if (!payload) {
      return
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = setTimeout(async () => {
      const [isMaximized, isFullscreen] = await Promise.all([appWindow.isMaximized(), appWindow.isFullscreen()])
      if (isMaximized || isFullscreen) {
        if (settingStore.resizeType !== ResizeType.Max) {
          await settingStore.updateResizeType(ResizeType.Max)
        }
        return
      }
      const factor = await appWindow.scaleFactor()
      const logical = payload.toLogical(factor)
      const width = Math.round(logical.width)
      const height = Math.round(logical.height)
      if (width <= 0 || height <= 0) {
        return
      }
      await settingStore.updateSize(width, height)
      if (settingStore.resizeType !== ResizeType.Custom) {
        await settingStore.updateResizeType(ResizeType.Custom)
      }
    }, debounceMs)
  })

  await appWindow.onMoved(({ payload }) => {
    if (!payload) {
      return
    }
    if (moveTimer) {
      clearTimeout(moveTimer)
    }
    moveTimer = setTimeout(async () => {
      const [isMaximized, isFullscreen] = await Promise.all([appWindow.isMaximized(), appWindow.isFullscreen()])
      if (isMaximized || isFullscreen) {
        return
      }
      const factor = await appWindow.scaleFactor()
      const logical = payload.toLogical(factor)
      await settingStore.updatePosition(Math.round(logical.x), Math.round(logical.y))
    }, debounceMs)
  })
}
