// Top toolbar for the API section
import { NButton, NDropdown, NIcon, NInput, useDialog, useMessage } from 'naive-ui'
import { DropdownMixedOption } from 'naive-ui/es/dropdown/src/interface'
import { defineComponent, inject, onBeforeUnmount, PropType } from 'vue'
import s from './header.module.css'

import { AnalyticsOutline, DownloadOutline, FolderOpenOutline, LinkOutline } from '@vicons/ionicons5'
import { useRoute } from 'vue-router'
import { HandleKey } from '../../constants/handle_key'
import {
  addFolderDefaultValue,
  addFolderKey,
  addHTTPSettingDefaultValue,
  addHTTPSettingFromCURLDefaultValue,
  addHTTPSettingFromCURLKey,
  addHTTPSettingKey,
} from '../../constants/provide'
import {
  hotKeyCreateFolder,
  hotKeyCreateHTTPSetting,
  hotKeyImportFromCURL,
  hotKeyMatchCreateFolder,
  hotKeyMatchCreateHTTPSetting,
  hotKeyMatchImportFromCURL,
} from '../../helpers/hot_key'
import { readTextFromClipboard, showError, writeSettingToDownload } from '../../helpers/util'
import { i18nCollection, i18nCommon } from '../../i18n'
import { useAPICollectionStore } from '../../stores/api_collection'
import { useAPIFolderStore } from '../../stores/api_folder'
import { SettingType, useAPISettingStore } from '../../stores/api_setting'
import { newImportDialog } from '../ExDialog'

export default defineComponent({
  name: 'APISettingTreeHeader',
  props: {
    onFilter: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
  },
  setup() {
    const route = useRoute()
    const message = useMessage()
    const dialog = useDialog()
    const apiFolderStore = useAPIFolderStore()
    const apiSettingStore = useAPISettingStore()
    const collectionStore = useAPICollectionStore()

    const collection = route.query.collection as string
    const addHTTPSetting = inject(addHTTPSettingKey, addHTTPSettingDefaultValue)
    const addHTTPSettingFromCURL = inject(addHTTPSettingFromCURLKey, addHTTPSettingFromCURLDefaultValue)
    const addFolder = inject(addFolderKey, addFolderDefaultValue)

    const handleKeydown = (e: KeyboardEvent) => {
      if (hotKeyMatchCreateFolder(e)) {
        addFolder('')
        return
      }
      if (hotKeyMatchImportFromCURL(e)) {
        addHTTPSettingFromCURL('')
        return
      }
      if (hotKeyMatchCreateHTTPSetting(e)) {
        addHTTPSetting('')
        return
      }
    }
    document.addEventListener('keydown', handleKeydown)
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
    })

    const handleImport = async () => {
      let data = ''
      try {
        data = (await readTextFromClipboard()) || ''
      } catch (err) {
        showError(message, err)
      } finally {
        newImportDialog({
          dialog,
          collection,
          data,
        })
      }
    }

    const handleExport = async () => {
      const arr: unknown[] = []
      apiFolderStore.apiFolders.forEach((folder) => arr.push(folder))
      apiSettingStore.apiSettings.forEach((apiSetting) => arr.push(apiSetting))
      try {
        let name = 'unknown'
        const result = collectionStore.findByID(collection)
        if (result) {
          name = result.name
        }
        await writeSettingToDownload(arr, name)
        message.info(i18nCollection('exportSettingsSuccess'))
      } catch (err) {
        showError(message, err)
      }
    }

    return {
      handleImport,
      handleExport,
      addHTTPSetting,
      addHTTPSettingFromCURL,
      addFolder,
      text: {
        add: i18nCommon('add'),
        placeholder: i18nCollection('filterPlaceholder'),
      },
    }
  },
  render() {
    const options: DropdownMixedOption[] = [
      {
        label: `${i18nCollection('newHTTPRequest')} | ${hotKeyCreateHTTPSetting()}`,
        key: SettingType.HTTP,
        icon: () => (
          <NIcon>
            <AnalyticsOutline />
          </NIcon>
        ),
      },
      {
        label: `${i18nCollection('importFromCURL')} | ${hotKeyImportFromCURL()}`,
        key: HandleKey.ImportFromCURL,
        icon: () => (
          <NIcon>
            <LinkOutline />
          </NIcon>
        ),
      },
      {
        label: `${i18nCollection('newFolder')} | ${hotKeyCreateFolder()}`,
        key: SettingType.Folder,
        icon: () => (
          <NIcon>
            <FolderOpenOutline />
          </NIcon>
        ),
      },
      {
        type: 'divider',
        key: 'divider',
      },
      {
        label: i18nCollection('exportSettings'),
        key: HandleKey.ExportSettings,
        icon: () => (
          <NIcon>
            <DownloadOutline class="rotate90" />
          </NIcon>
        ),
      },
      {
        label: i18nCollection('importSettings'),
        key: HandleKey.ImportSettings,
        icon: () => (
          <NIcon>
            <DownloadOutline class="rotate270" />
          </NIcon>
        ),
      },
    ]
    const { text } = this
    const inputProps = {
      spellcheck: false,
    }
    return (
      <div class={s.header}>
        <div class={s.filter}>
          <NInput
            type="text"
            clearable
            inputProps={inputProps}
            placeholder={text.placeholder}
            onInput={(value: string) => {
              this.$props.onFilter(value.toLowerCase())
            }}
          />
        </div>
        <div class={s.actions}>
          <NDropdown
            trigger="click"
            options={options}
            renderLabel={(option) => {
              const arr = (option.label as string).split(' | ')
              const hotkey = arr.length === 2 ? <span class={s.hotKey}>{arr[1]}</span> : undefined

              return (
                <div class={s.label}>
                  {arr[0]}
                  {hotkey}
                </div>
              )
            }}
            onSelect={(key: string) => {
              switch (key) {
                case SettingType.HTTP:
                  this.addHTTPSetting('')
                  break
                case HandleKey.ImportFromCURL:
                  this.addHTTPSettingFromCURL('')
                  break
                case SettingType.Folder:
                  this.addFolder('')
                  break
                case HandleKey.ImportSettings:
                  this.handleImport()
                  break
                case HandleKey.ExportSettings:
                  this.handleExport()
                  break
              }
            }}
          >
            <NButton>{text.add}</NButton>
          </NDropdown>
        </div>
      </div>
    )
  },
})
