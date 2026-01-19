import { message } from '@tauri-apps/plugin-dialog'
import { darkTheme, NConfigProvider, NDialogProvider, NGlobalStyle, NLoadingBarProvider, NMessageProvider, NNotificationProvider } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { defineComponent, onBeforeMount, ref } from 'vue'

import App from './App'
import { showMainWindow } from './commands/window'
import ExLoading from './components/ExLoading'
import { formatError } from './helpers/util'
import { getLocale } from './i18n'
import { useAppStore } from './stores/app'
import { useSettingStore } from './stores/setting'

async function safeShowMainWindow() {
  try {
    await showMainWindow()
  } catch (e) {
    console.warn('showMainWindow failed', e)
  }
}

function tryShowError(err: unknown) {
  try {
    message(formatError(err), 'Error')
  } catch (e) {
    console.warn('Failed to show dialog error message', e)
  }
}

export default defineComponent({
  name: 'RootView',
  setup() {
    const settingStore = useSettingStore()
    const appStore = useAppStore()
    const { isDark } = storeToRefs(settingStore)
    const processing = ref(true)

    if (window.location.protocol.includes('tauri')) {
      document.addEventListener('contextmenu', (e) => e.preventDefault())
    }

    const handleStepError = (err: unknown, step: string) => {
      console.error(`${step} failed`, err)
      tryShowError(err)
    }

    onBeforeMount(async () => {
      await appStore.fetch().catch((err) => {
        handleStepError(err, 'appStore.fetch')
      })

      await settingStore.fetch().catch((err) => {
        handleStepError(err, 'settingStore.fetch')
      })

      await settingStore.resize().catch((err) => {
        handleStepError(err, 'settingStore.resize')
      })

      await settingStore.restoreWindowPosition().catch((err) => {
        handleStepError(err, 'settingStore.restoreWindowPosition')
      })

      try {
        await safeShowMainWindow()
      } catch (err) {
        handleStepError(err, 'safeShowMainWindow')
      } finally {
        processing.value = false
      }
    })

    return { processing, isDark }
  },
  render() {
    const { processing, isDark } = this
    if (processing) {
      return <ExLoading />
    }

    return (
      <NConfigProvider theme={isDark ? darkTheme : null} locale={getLocale()}>
        <NGlobalStyle />
        <NLoadingBarProvider>
          <NMessageProvider>
            <NNotificationProvider>
              <NDialogProvider>
                <App />
              </NDialogProvider>
            </NNotificationProvider>
          </NMessageProvider>
        </NLoadingBarProvider>
      </NConfigProvider>
    )
  },
})
