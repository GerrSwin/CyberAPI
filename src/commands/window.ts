import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/window'
import { isWebMode } from '../helpers/util'

const appWindow = getCurrentWebviewWindow()

export async function showMainWindow() {
  if (isWebMode()) {
    return
  }
  await appWindow.show()
}

export async function setWindowSize(width: number, height: number) {
  if (isWebMode()) {
    return
  }
  // If a size is set below 0, maximize
  if (width < 0 || height < 0) {
    await appWindow.maximize()
  } else if (width > 0 && height > 0) {
    await appWindow.setSize(new LogicalSize(width, height))
  }
}

export async function setWindowPosition(x: number, y: number) {
  if (isWebMode()) {
    return
  }
  const clampedX = Math.max(0, x)
  const clampedY = Math.max(0, y)
  await appWindow.setPosition(new LogicalPosition(clampedX, clampedY))
}
