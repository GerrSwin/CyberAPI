import { open } from '@tauri-apps/plugin-dialog'
import {
  AppsOutline,
  BowlingBallOutline,
  CodeSlashOutline,
  DownloadOutline,
  LanguageOutline,
  ServerOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import { NBreadcrumb, NBreadcrumbItem, NButton, NDivider, NDropdown, NIcon, NSelect, NSpace, NTab, NTabs, useDialog, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { defineComponent, onBeforeUnmount, ref, StyleValue, watch } from 'vue'
import { useRoute } from 'vue-router'
import s from './AppHeader.module.css'

import { exportTables, importTables } from '../commands/database'
import { Environment, EnvironmentStatus } from '../commands/environment'
import { reload, showError } from '../helpers/util'
import { getCurrentLang, i18nCommon, i18nEnvironment, i18nSetting, LANG } from '../i18n'
import { logoIcon } from '../icons'
import { goTo } from '../router'
import { names } from '../router/routes'
import { useAPISettingStore } from '../stores/api_setting'
import { useDialogStore } from '../stores/dialog'
import { useEnvironmentStore } from '../stores/environment'
import { useHeaderStore } from '../stores/header'
import { setLang } from '../stores/local'
import { usePinRequestStore } from '../stores/pin_request'
import { useSettingStore } from '../stores/setting'

const logoWidth = 300
const headerStyle = {
  '--logo-icon': `url(${logoIcon})`,
  '--logo-width': `${logoWidth}px`,
} as Record<string, string>

enum FnKey {
  cookie = 'cookie',
  store = 'store',
  env = 'env',
  setting = 'setting',
  exportTables = 'expxortTables',
  importTables = 'importTables',
  reqHeader = 'reqHeader',
  none = 'none',
}

export default defineComponent({
  name: 'AppHeaderView',
  setup() {
    const message = useMessage()
    const dialog = useDialog()
    const headerStore = useHeaderStore()
    const dialogStore = useDialogStore()
    const route = useRoute()
    const settingStore = useSettingStore()

    const apiSettingStore = useAPISettingStore()
    const pinRequestStore = usePinRequestStore()
    const environmentStore = useEnvironmentStore()
    const { environments } = storeToRefs(environmentStore)

    const { requests } = storeToRefs(pinRequestStore)

    const activePinRequest = ref('')
    let activePinRequestID = ''

    const { collectionColumnWidths } = storeToRefs(settingStore)

    const currentRoute = ref(route.name)
    watch(
      () => route.name,
      (value) => {
        currentRoute.value = value
      },
    )

    const { breadcrumbs } = storeToRefs(headerStore)
    const stop = watch(
      () => apiSettingStore.selectedID,
      (id) => {
        // If it's not the current tab, clear it
        if (id !== activePinRequestID) {
          activePinRequest.value = ''
          pinRequestStore.requests.forEach((item, index) => {
            if (item.id === id) {
              const result = apiSettingStore.findByID(id)
              if (!result) {
                return
              }
              activePinRequest.value = `${index + 1}: ${result.name}`
            }
          })
        }
      },
    )
    onBeforeUnmount(() => {
      stop()
    })

    const getRequest = (name: string) => {
      const arr = name.split(':')
      const index = Number(arr[0]) - 1
      return pinRequestStore.requests[index]
    }

    const handleSelectePinRequest = (name: string) => {
      const req = getRequest(name)
      if (!req) {
        return
      }
      apiSettingStore.select(req.id)
      activePinRequest.value = name
      activePinRequestID = req.id
    }
    const handleRemovePinRequest = (name: string) => {
      const req = getRequest(name)
      if (!req) {
        return
      }
      pinRequestStore.remove(req.id)
    }

    const handleBackup = async () => {
      const d = message.loading(i18nSetting('exportTablesProcessing'), {
        duration: 60 * 1000,
      })
      try {
        const filename = await exportTables()
        const msg = i18nSetting('exportTablesSuccess').replace('%s', filename)
        message.info(msg)
      } finally {
        d.destroy()
      }
    }

    const confirmRestore = async (file: string) => {
      try {
        await importTables(file)
        message.info(i18nSetting('importTablesSuccess'))
        setTimeout(reload, 3000)
      } catch (err) {
        showError(message, err)
      }
    }
    const handleRestore = async () => {
      try {
        const selected = await open({
          title: i18nCommon('selectFile'),
          filters: [
            {
              name: 'zip',
              extensions: ['zip'],
            },
          ],
        })
        if (selected) {
          dialog.warning({
            title: i18nSetting('importTables'),
            content: i18nSetting('importTablesTips'),
            onPositiveClick() {
              confirmRestore(selected as string)
            },
            positiveText: i18nCommon('confirm'),
          })
        }
      } catch (err) {
        showError(message, err)
      }
    }

    const handleFunction = (key: string) => {
      switch (key) {
        case FnKey.cookie:
          dialogStore.toggleCookieDialog(true)
          break
        case FnKey.store:
          dialogStore.toggleStoreDialog(true)
          break
        case FnKey.env:
          dialogStore.toggleEnvironmentManagerDialog(true)
          break
        case FnKey.setting:
          dialogStore.toggleSettingDialog(true)
          break
        case FnKey.reqHeader:
          dialogStore.toggleReqHeaderDialog(true)
          break
        case FnKey.exportTables:
          handleBackup()
          break
        case FnKey.importTables:
          handleRestore()
          break
        default:
          break
      }
    }

    const handleChangeLang = async (lang: string) => {
      if (lang === getCurrentLang()) {
        return
      }
      try {
        await setLang(lang)
        message.info(i18nSetting('langChangeSuccess'))
        setTimeout(() => {
          reload()
        }, 3000)
      } catch (err) {
        showError(message, err)
      }
    }

    const handleSelectEnvironment = async (id: string) => {
      const list = environmentStore.environments
      if (!list.length) {
        return
      }
      const updates: Environment[] = []
      list.forEach((item) => {
        const shouldEnable = id ? item.id === id : false
        const nextEnabled = shouldEnable ? EnvironmentStatus.Enabled : EnvironmentStatus.Disabled
        if (item.enabled !== nextEnabled) {
          updates.push({
            ...item,
            enabled: nextEnabled,
          })
        }
      })
      if (!updates.length) {
        return
      }
      await Promise.all(updates.map((item) => environmentStore.update(item)))
    }
    return {
      requests,
      activePinRequest,
      collectionColumnWidths,
      currentRoute,
      breadcrumbs,
      handleFunction,
      handleSelectePinRequest,
      handleRemovePinRequest,
      handleChangeLang,
      handleSelectEnvironment,
      environments,
      findByID: apiSettingStore.findByID,
    }
  },
  render() {
    const { requests, collectionColumnWidths, breadcrumbs, $route, findByID, currentRoute, activePinRequest, environments } = this
    const isCollection = currentRoute === names.collection
    const arr = [
      {
        route: names.home,
        name: i18nCommon('dashboard'),
      },
    ]
    arr.push(...breadcrumbs)
    const items = arr.map((item) => {
      return (
        <NBreadcrumbItem
          key={item.route}
          onClick={() => {
            if (item.route === $route.name) {
              return
            }
            goTo(item.route)
          }}
        >
          {item.name}
        </NBreadcrumbItem>
      )
    })
    const pinApisStyle: StyleValue = {}
    const columnWidth = collectionColumnWidths[0] ?? 0
    if (columnWidth > logoWidth) {
      pinApisStyle['margin-left'] = `${columnWidth - logoWidth + 2}px`
    }

    const getTabs = () => {
      return requests.map((item, index) => {
        const result = findByID(item.id)
        if (!result) {
          return
        }
        const name = `${index + 1}: ${result.name}`
        return <NTab name={name} key={name}></NTab>
      })
    }

    const options = [
      {
        label: i18nSetting('cookieSetting'),
        key: FnKey.cookie,
        type: '',
        icon: () => (
          <NIcon>
            <BowlingBallOutline />
          </NIcon>
        ),
      },
      {
        label: i18nSetting('storeSetting'),
        key: FnKey.store,
        icon: () => (
          <NIcon>
            <ServerOutline />
          </NIcon>
        ),
      },
      {
        label: i18nSetting('appSetting'),
        key: FnKey.setting,
        icon: () => (
          <NIcon>
            <SettingsOutline />
          </NIcon>
        ),
      },
    ]
    switch (currentRoute) {
      case names.home:
        {
          options.push(
            {
              label: '',
              type: 'divider',
              key: FnKey.none,
              icon: () => <NIcon />,
            },
            {
              label: i18nSetting('exportTables'),
              key: FnKey.exportTables,
              icon: () => (
                <NIcon>
                  <DownloadOutline />
                </NIcon>
              ),
            },
            {
              label: i18nSetting('importTables'),
              key: FnKey.importTables,
              icon: () => (
                <NIcon>
                  <DownloadOutline class="rotate180" />
                </NIcon>
              ),
            },
          )
        }
        break
      case names.collection:
        {
          options.unshift(
            {
              label: i18nSetting('reqHeaderSetting'),
              key: FnKey.reqHeader,
              icon: () => <span>H</span>,
            },
            {
              label: '',
              type: 'divider',
              key: FnKey.none,
              icon: () => <NIcon />,
            },
          )
        }
        break

      default:
        break
    }

    const langs = [
      {
        label: '中文',
        key: LANG.zh,
      },
      {
        label: 'English',
        key: LANG.en,
      },
      {
        label: 'Українська',
        key: LANG.uk,
      },
    ]

    const noEnvironmentLabel = i18nEnvironment('none')
    const environmentOptions = environments.map((item) => {
      return {
        label: item.name,
        value: item.id,
      }
    })
    environmentOptions.unshift({
      label: noEnvironmentLabel,
      value: '',
    })
    const activeEnvironment = environments.find((item) => item.enabled === EnvironmentStatus.Enabled)
    const activeEnvironmentID = activeEnvironment ? activeEnvironment.id : ''

    return (
      <header class={s.header} style={headerStyle}>
        <div class={s.left}>
          <div class={s.logo}>
            <span>{i18nCommon('app')}</span>
            <NDivider vertical />
          </div>
          <NBreadcrumb class={s.breadcrumbs}>{items}</NBreadcrumb>
        </div>
        {isCollection && (
          <div class={s.pinApis} style={pinApisStyle}>
            <NTabs
              type="card"
              closable
              tabStyle={{
                'min-width': '100px',
                'border-bottom': 'none',
              }}
              defaultValue={''}
              value={activePinRequest}
              onClose={(value) => {
                this.handleRemovePinRequest(value)
              }}
              onUpdateValue={(value: string) => {
                this.handleSelectePinRequest(value)
              }}
            >
              {getTabs()}
            </NTabs>
          </div>
        )}
        <div class={s.actions}>
          <NSpace align="center">
            {isCollection && (
              <>
                <NButton
                  text
                  onClick={() => {
                    this.handleFunction(FnKey.env)
                  }}
                >
                  <NIcon>
                    <CodeSlashOutline />
                  </NIcon>
                </NButton>
                <NSelect
                  consistentMenuWidth={false}
                  options={environmentOptions}
                  placeholder={noEnvironmentLabel}
                  value={activeEnvironmentID}
                  onUpdateValue={(value: string) => {
                    this.handleSelectEnvironment(value)
                  }}
                />
                <NDivider class={s.divider} vertical />
              </>
            )}
            <NDropdown
              options={options}
              onSelect={(key: string) => {
                this.handleFunction(key)
              }}
            >
              <NIcon>
                <AppsOutline />
              </NIcon>
            </NDropdown>
            <NDropdown
              options={langs}
              onSelect={(key: string) => {
                this.handleChangeLang(key)
              }}
            >
              <NIcon>
                <LanguageOutline />
              </NIcon>
            </NDropdown>
          </NSpace>
        </div>
      </header>
    )
  },
})
