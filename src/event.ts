import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isWebMode } from './helpers/util'
import { ResizeType, useSettingStore } from './stores/setting'
const appWindow = getCurrentWebviewWindow()

export async function initWindowEvent() {
  if (isWebMode()) {
    return
  }
  const settingStore = useSettingStore()

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
      const isMinimized = await appWindow.isMinimized()
      if (isMinimized) {
        return
      }

      // During shutdown Windows may emit a final move event with a bogus (0,0) payload.
      // Don't trust the event payload; query the actual current window position instead.
      const factor = await appWindow.scaleFactor()
      let logicalX = 0
      let logicalY = 0
      try {
        const physical = await appWindow.outerPosition()
        const logical = physical.toLogical(factor)
        logicalX = Math.round(logical.x)
        logicalY = Math.round(logical.y)
      } catch {
        const logical = payload.toLogical(factor)
        logicalX = Math.round(logical.x)
        logicalY = Math.round(logical.y)
      }

      // If we suddenly get (0,0) while we previously had a non-zero position,
      // treat it as a shutdown artifact and keep the last known good position.
      if (logicalX === 0 && logicalY === 0 && settingStore.position && (settingStore.position.x !== 0 || settingStore.position.y !== 0)) {
        return
      }

      await settingStore.updatePosition(logicalX, logicalY)
    }, debounceMs)
  })
}
