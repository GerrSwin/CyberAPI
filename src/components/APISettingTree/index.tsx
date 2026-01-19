// API app config list
import { useDialog, useMessage } from 'naive-ui'
import { defineComponent, provide, ref } from 'vue'
import s from './index.module.css'

import { useRoute } from 'vue-router'
import { newDefaultAPIFolder } from '../../commands/api_folder'
import { newDefaultAPISetting } from '../../commands/api_setting'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { addFolderKey, addHTTPSettingFromCURLKey, addHTTPSettingKey } from '../../constants/provide'
import parseCurl from '../../helpers/curl'
import { showError } from '../../helpers/util'
import { i18nCollection, i18nCommon } from '../../i18n'
import { useAPIFolderStore } from '../../stores/api_folder'
import { SettingType, useAPISettingStore } from '../../stores/api_setting'
import ExDialog from '../ExDialog'
import { ExFormItem } from '../ExForm'
import APISettingTreeHeader from './header'
import APISettingTreeItems from './items'

const getSettingFormItems = (): ExFormItem[] => {
  return [
    {
      key: 'name',
      label: i18nCommon('name'),
      placeholer: i18nCommon('namePlaceholder'),
      rule: {
        required: true,
        message: i18nCommon('nameRequireError'),
        trigger: 'blur',
      },
    },
  ]
}

const getFolderFormItems = (): ExFormItem[] => {
  return [
    {
      key: 'name',
      label: i18nCommon('name'),
      placeholer: i18nCommon('namePlaceholder'),
      rule: {
        required: true,
        message: i18nCommon('nameRequireError'),
        trigger: 'blur',
      },
    },
  ]
}

const getCurlFormItems = (): ExFormItem[] => {
  return [
    {
      key: 'curl',
      label: i18nCollection('importFromCURL'),
      placeholer: i18nCollection('curlPlaceholder'),
      inputType: 'textarea',
      rule: {
        required: true,
        message: i18nCollection('curlPlaceholder'),
        trigger: 'blur',
      },
    },
  ]
}

const getNameFromURI = (uri: string) => {
  try {
    const url = new URL(uri)
    const arr = url.pathname.split('/').filter((item) => item)
    return arr.pop() || i18nCommon('untitled')
  } catch (err) {
    console.error(err)
    return i18nCommon('untitled')
  }
}

export default defineComponent({
  name: 'APISettingTree',
  setup() {
    const keyword = ref('')
    const apiSettingStore = useAPISettingStore()
    const apiFolderStore = useAPIFolderStore()
    const dialog = useDialog()
    const route = useRoute()
    const message = useMessage()
    const collection = route.query.collection as string

    provide(addHTTPSettingKey, (folder: string) => {
      ExDialog({
        dialog,
        title: i18nCollection('newHTTPRequest'),
        formItems: getSettingFormItems(),
        onConfirm: async (data) => {
          const setting = newDefaultAPISetting()
          setting.category = SettingType.HTTP
          setting.collection = collection
          setting.name = data.name as string
          try {
            await apiSettingStore.add(setting)
            if (folder) {
              await apiFolderStore.addChild({
                id: folder,
                children: [setting.id],
              })
            }
            apiSettingStore.select(setting.id)
          } catch (err) {
            showError(message, err)
          }
        },
      })
    })
    provide(addHTTPSettingFromCURLKey, (folder: string) => {
      ExDialog({
        dialog,
        title: i18nCollection('importFromCURL'),
        formItems: getCurlFormItems(),
        onConfirm: async (data) => {
          try {
            const curl = (data.curl as string).trim()
            let req
            try {
              req = parseCurl(curl)
            } catch (err) {
              console.error(err)
              throw new Error(i18nCollection('curlParseFail'))
            }
            if (!req || !req.uri) {
              throw new Error(i18nCollection('curlParseFail'))
            }
            req.body = req.body || ''
            req.headers = req.headers || []
            req.query = req.query || []
            req.auth = req.auth || []
            req.contentType = req.contentType || ''
            req.method = req.method || 'GET'
            const setting = newDefaultAPISetting()
            setting.category = SettingType.HTTP
            setting.collection = collection
            setting.name = getNameFromURI(req.uri)
            setting.setting = JSON.stringify(req)
            await apiSettingStore.add(setting)
            if (folder) {
              await apiFolderStore.addChild({
                id: folder,
                children: [setting.id],
              })
            }
            apiSettingStore.select(setting.id)
          } catch (err) {
            showError(message, err)
          }
        },
      })
    })
    provide(addFolderKey, (parentFolder: string) => {
      ExDialog({
        dialog,
        title: i18nCollection('newFolder'),
        formItems: getFolderFormItems(),
        onConfirm: async (data) => {
          const folder = newDefaultAPIFolder()
          folder.collection = collection
          folder.name = data.name as string
          try {
            await apiFolderStore.add(folder)
            if (folder) {
              await apiFolderStore.addChild({
                id: parentFolder,
                children: [folder.id],
              })
            }
          } catch (err) {
            showError(message, err)
          }
        },
      })
    })
    return {
      keyword,
    }
  },
  render() {
    return (
      <div class={s.treesClass}>
        <APISettingTreeHeader
          onFilter={(value: string) => {
            this.keyword = value
          }}
        />
        <APISettingTreeItems keyword={this.keyword} />
      </div>
    )
  },
})
