import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputGroup,
  NInputNumber,
  NP,
  NRadio,
  NRadioGroup,
  NSpace,
  NTabPane,
  NTabs,
  useMessage,
} from 'naive-ui'
import { defineComponent, onBeforeUnmount, ref, watch } from 'vue'

import { open } from '@tauri-apps/plugin-dialog'
import { storeToRefs } from 'pinia'
import { getNormalDialogStyle, isWebMode, reload, showError } from '../helpers/util'
import { i18nSetting } from '../i18n'
import { useAppStore } from '../stores/app'
import { ResizeType, useSettingStore } from '../stores/setting'
import ProxySetting from './ProxySetting'

export default defineComponent({
  name: 'AppSettingView',
  setup() {
    const settingStore = useSettingStore()
    const appStore = useAppStore()
    const message = useMessage()
    const webMode = isWebMode()
    const { theme, size, resizeType, timeout, dbPath } = storeToRefs(settingStore)
    const dbPathInput = ref('')
    const updateTheme = async (value: string) => {
      try {
        await settingStore.updateTheme(value)
      } catch (err) {
        showError(message, err)
      }
    }
    let resized = false
    onBeforeUnmount(() => {
      if (!resized) {
        return
      }
      settingStore.resize()
    })
    const updateSize = async (value: number, category: string) => {
      try {
        let { width, height } = settingStore.size
        if (category == 'width') {
          width = value
        } else {
          height = value
        }

        await settingStore.updateSize(width, height)
        resized = true
      } catch (err) {
        showError(message, err)
      }
    }
    const updateResizeType = async (value: string) => {
      try {
        resized = true
        await settingStore.updateResizeType(value)
      } catch (err) {
        showError(message, err)
      }
    }
    const updateTimeout = async (category: string, value: number) => {
      try {
        const timeout = Object.assign({}, settingStore.timeout)
        switch (category) {
          case 'connect':
            timeout.connect = value
            break
          case 'write':
            timeout.write = value
            break
          case 'read':
            timeout.read = value
            break
          default:
            break
        }
        await settingStore.updateRequestTimeout(timeout)
      } catch (err) {
        showError(message, err)
      }
    }
    const resolveDefaultDbPath = () => {
      const base = dbPath.value || appStore.dir
      return base === '--' ? '' : base
    }
    dbPathInput.value = resolveDefaultDbPath()
    watch(
      () => [dbPath.value, appStore.dir],
      () => {
        dbPathInput.value = resolveDefaultDbPath()
      },
    )
    const saveDbPath = async (path?: string) => {
      if (webMode) {
        return
      }
      const raw = path ?? dbPathInput.value
      const nextPath = raw.trim()
      if (!nextPath) {
        return
      }
      const currentPath = dbPath.value || appStore.dir
      if (nextPath === currentPath) {
        return
      }
      try {
        await settingStore.updateDbPath(nextPath)
        message.info(i18nSetting('dbPathChangeSuccess'))
        setTimeout(reload, 3000)
      } catch (err) {
        showError(message, err)
      }
    }
    const selectDbPath = async () => {
      if (webMode) {
        return
      }
      try {
        const defaultPath = dbPath.value || (appStore.dir === '--' ? '' : appStore.dir)
        const selected = await open({
          title: i18nSetting('dbPathSelectTitle'),
          directory: true,
          multiple: false,
          defaultPath: defaultPath || undefined,
        })
        if (!selected) {
          return
        }
        const path = Array.isArray(selected) ? selected[0] : selected
        if (!path) {
          return
        }
        dbPathInput.value = path
        await saveDbPath(path)
      } catch (err) {
        showError(message, err)
      }
    }
    return {
      timeout,
      theme,
      size,
      resizeType,
      dbPath,
      dbPathInput,
      infos: [
        {
          name: i18nSetting('appVersion'),
          value: appStore.version,
        },
        {
          name: 'Tauri',
          value: appStore.tauriVersion,
        },
        {
          name: i18nSetting('platform'),
          value: appStore.platform,
        },
        {
          name: i18nSetting('os'),
          value: appStore.os,
        },
        {
          name: i18nSetting('osVersion'),
          value: appStore.osVersion,
        },
        {
          name: i18nSetting('arch'),
          value: appStore.arch,
        },
        {
          name: i18nSetting('userAgent'),
          value: appStore.userAgent,
          span: 3,
        },
        {
          name: i18nSetting('browser'),
          value: window.navigator.userAgent,
          span: 3,
        },
      ],
      updateSize,
      updateTheme,
      updateResizeType,
      updateTimeout,
      selectDbPath,
      saveDbPath,
      webMode,
    }
  },
  render() {
    const modalStyle = getNormalDialogStyle()
    const { theme, size, resizeType, updateSize, updateResizeType, timeout, dbPathInput, webMode } = this
    const descriptionItems = this.infos.map((item) => {
      return (
        <NDescriptionsItem label={item.name} key={item.name} span={item.span}>
          {item.value}
        </NDescriptionsItem>
      )
    })
    const generalContent = (
      <>
        <NP>{i18nSetting('themeTitle')}</NP>
        <NSpace vertical>
          <NRadioGroup value={theme} onUpdateValue={this.updateTheme}>
            <NSpace>
              <NRadio label={i18nSetting('systemTheme')} value="" />
              <NRadio label={i18nSetting('darkTheme')} value="dark" />
              <NRadio label={i18nSetting('lightTheme')} value="light" />
            </NSpace>
          </NRadioGroup>
        </NSpace>
        <NDivider />
        <NP>{i18nSetting('windowSize')}</NP>
        <NGrid xGap={20}>
          <NGi span={8}>
            <NFormItem label={i18nSetting('windowResizeType')}>
              <NRadioGroup value={resizeType} onUpdateValue={updateResizeType}>
                <NSpace>
                  <NRadio label={i18nSetting('windowMaxSize')} value={ResizeType.Max} />
                  <NRadio label={i18nSetting('windowCustomSize')} value={ResizeType.Custom} />
                </NSpace>
              </NRadioGroup>
            </NFormItem>
          </NGi>
          <NGi span={8}>
            <NFormItem label={i18nSetting('windowWidth')}>
              <NInputNumber
                class="widthFull"
                placeholder={i18nSetting('windowWidthPlaceholder')}
                min={900}
                disabled={resizeType === ResizeType.Max}
                defaultValue={size?.width || null}
                onUpdateValue={(value) => {
                  updateSize(value || 0, 'width')
                }}
              />
            </NFormItem>
          </NGi>
          <NGi span={8}>
            <NFormItem label={i18nSetting('windowHeight')}>
              <NInputNumber
                class="widthFull"
                placeholder={i18nSetting('windowHeightPlaceholder')}
                disabled={resizeType === ResizeType.Max}
                min={600}
                defaultValue={size?.height || null}
                onUpdateValue={(value) => {
                  updateSize(value || 0, 'height')
                }}
              />
            </NFormItem>
          </NGi>
        </NGrid>
        <NDivider />
        <NP>{i18nSetting('timeoutSetting')}</NP>
        <NGrid xGap={20}>
          <NGi span={8}>
            <NFormItem label={i18nSetting('timeoutConnect')}>
              <NInputNumber
                class="widthFull"
                min={0}
                defaultValue={timeout?.connect || null}
                onUpdateValue={(value) => {
                  this.updateTimeout('connect', value || 0)
                }}
              />
            </NFormItem>
          </NGi>
          <NGi span={8}>
            <NFormItem label={i18nSetting('timeoutRead')}>
              <NInputNumber
                class="widthFull"
                min={0}
                defaultValue={timeout?.read || null}
                onUpdateValue={(value) => {
                  this.updateTimeout('read', value || 0)
                }}
              />
            </NFormItem>
          </NGi>
          <NGi span={8}>
            <NFormItem label={i18nSetting('timeoutWrite')}>
              <NInputNumber
                class="widthFull"
                min={0}
                defaultValue={timeout?.write || null}
                onUpdateValue={(value) => {
                  this.updateTimeout('write', value || 0)
                }}
              />
            </NFormItem>
          </NGi>
        </NGrid>
        <NDivider />
        <NP>{i18nSetting('infoTitle')}</NP>
        <NFormItem label={i18nSetting('dir')}>
          <NInputGroup>
            <NInput
              class="widthFull"
              value={dbPathInput}
              placeholder={i18nSetting('dbPathPlaceholder')}
              disabled={webMode}
              onUpdateValue={(value) => {
                this.dbPathInput = value
              }}
            />
            <NButton disabled={webMode} onClick={this.selectDbPath}>
              {i18nSetting('dbPathBrowse')}
            </NButton>
            <NButton disabled={webMode} onClick={() => this.saveDbPath()}>
              {i18nSetting('dbPathSave')}
            </NButton>
          </NInputGroup>
        </NFormItem>
        <NP>{i18nSetting('dbPathHelp')}</NP>
        <NDescriptions>{descriptionItems}</NDescriptions>
      </>
    )
    return (
      <NCard title={i18nSetting('title')} style={modalStyle}>
        <NTabs defaultValue="general" animated>
          <NTabPane name="general" tab={i18nSetting('generalTab')}>
            {generalContent}
          </NTabPane>
          <NTabPane name="proxy" tab={i18nSetting('proxyTab')}>
            <ProxySetting />
          </NTabPane>
        </NTabs>
      </NCard>
    )
  },
})
