import { message } from '@tauri-apps/plugin-dialog'
import { create } from 'naive-ui'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'

import Debug from 'debug'
import { handleDatabaseCompatible } from './commands/database'
import { initWindowEvent } from './event'
import { isWebMode } from './helpers/util'
import { changeI18nLocale, LANG } from './i18n'
import Root from './root'
import router, { goTo } from './router'
import { getLang } from './stores/local'
import { getAppLatestRoute } from './stores/setting'
import './userWorker'

// web mode enable debug:*
if (isWebMode()) {
  Debug.enable('*')
}

const app = createApp(Root)
const pinia = createPinia()
setActivePinia(pinia)
app.use(pinia)

async function init() {
  initWindowEvent()
  // TODO verify database version
  // Determine whether a database upgrade is needed
  await handleDatabaseCompatible()
  const lang = (await getLang()) || LANG.zh
  changeI18nLocale(lang)
  app.use(router)
  // Open the last page in non-browser mode
  if (!isWebMode()) {
    const route = await getAppLatestRoute()
    if (route.name) {
      goTo(route.name, {
        query: route.query,
      })
    }
  }
}

const naive = create()
init()
  // Show a dialog if initialization fails
  .catch(console.error)
  .finally(() => {
    // TODO confirm whether the customer allows sending this kind of error info to the service
    // For future optimization
    const unknown = 'unknown'
    app.config.errorHandler = (err, instance, info) => {
      const name = instance?.$options.name || unknown
      const msg = (err as Error).message || unknown
      const content = `${name}(${msg}): ${info}`
      if (isWebMode()) {
        console.error(content)
        throw err
      } else {
        message(content)
      }
    }
    app.use(naive).mount('#app')
  })
