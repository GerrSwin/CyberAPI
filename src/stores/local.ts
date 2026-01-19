import localforage from 'localforage'

const stores: Map<string, LocalForage> = new Map()

function createNewStore(name: string) {
  let store: LocalForage
  return function () {
    if (!store) {
      store = localforage.createInstance({
        name,
      })
    }
    stores.set(name, store)
    return store
  }
}

export enum StoreKey {
  expandedSetting = 'expandedSetting',
  topTreeItem = 'topTreeItem',
  tabActive = 'tabActive',
  apiSetting = 'apiSetting',
  setting = 'setting',
  pinRequests = 'pinRequests',
  latestResponse = 'latestResponse',
  lang = 'lang',
}

// Store expanded settings
export const getExpandedSettingStore = createNewStore(StoreKey.expandedSetting)

// Store top-level settings
export const getTopTreeItemStore = createNewStore(StoreKey.topTreeItem)

// Store active tab
export const getTabActiveStore = createNewStore(StoreKey.tabActive)

// Extra records for API Setting, such as selected items
export const getAPISettingStore = createNewStore(StoreKey.apiSetting)

// App settings
export const getSettingStore = createNewStore(StoreKey.setting)

// Pinned API settings
export const getPinRequestStore = createNewStore(StoreKey.pinRequests)

// Latest request response
export const getLatestResponseStore = createNewStore(StoreKey.latestResponse)

const langKey = 'lang'

const getLangStore = createNewStore(StoreKey.lang)
// Language settings
export async function getLang() {
  const lang = await getLangStore().getItem(langKey)
  if (lang) {
    return lang as string
  }
  const arr = window.navigator.language?.split('-')
  return arr[0] || ''
}

export async function setLang(lang: string) {
  await getLangStore().setItem(langKey, lang)
}

export async function clearStore(name: StoreKey) {
  const s = stores.get(name)
  if (!s) {
    return
  }
  await s.clear()
}
