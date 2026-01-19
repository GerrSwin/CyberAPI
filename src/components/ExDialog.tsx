import { CloudUploadOutline } from '@vicons/ionicons5'
import * as monaco from 'monaco-editor'
import { NButton, NIcon, NTabPane, NTabs, NText, NUpload, NUploadDragger, UploadFileInfo, useMessage } from 'naive-ui'
import { DialogApiInjection } from 'naive-ui/es/dialog/src/DialogProvider'
import { defineComponent, onBeforeUnmount, PropType, ref } from 'vue'
import { importAPI, ImportCategory } from '../commands/import_api'
import { createEditor } from '../helpers/editor'
import { delay, getNormalDialogStyle, isJSON, jsonFormat, showError } from '../helpers/util'
import { i18nCollection, i18nCommon } from '../i18n'
import { useAPIFolderStore } from '../stores/api_folder'
import { useAPISettingStore } from '../stores/api_setting'
import { useEnvironmentStore, useEnvironmentVariableStore } from '../stores/environment'
import { useSettingStore } from '../stores/setting'
import s from './ExDialog.module.css'
import ExForm, { ExFormItem, ExUpdateData } from './ExForm'

interface OnConfirm {
  (data: ExUpdateData): Promise<void>
}
interface DialogOption {
  dialog: DialogApiInjection
  title: string
  enterTriggerSubmit?: boolean
  formItems: ExFormItem[]
  onConfirm: OnConfirm
}

interface ImportDialogOption {
  dialog: DialogApiInjection
  collection: string
  folder?: string
  data: string
}
export default function newDialog(option: DialogOption) {
  const { dialog, formItems } = option
  const d = dialog.info({
    title: option.title,
    autoFocus: true,
    closable: false,
    content: () => (
      <ExForm
        enterTriggerSubmit={option.enterTriggerSubmit}
        formItems={formItems}
        onSubmit={async (data) => {
          await option.onConfirm(data)
          d.destroy()
          // Add a delay; otherwise rapid clicks trigger twice
          await delay(100)
        }}
      />
    ),
  })
}

const importWrapperHeight = 300
const ImportEditor = defineComponent({
  name: 'ImportEditor',
  props: {
    data: {
      type: String,
      default: () => '',
    },
    collection: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      default: () => '',
    },
    onConfirm: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    const settingStore = useSettingStore()
    const apiSettingStore = useAPISettingStore()
    const apiFolderStore = useAPIFolderStore()
    const message = useMessage()

    const currentTab = ref(ImportCategory.Text)
    const fileData = ref('')

    let editorIns: monaco.editor.IStandaloneCodeEditor | null
    const destroyEditor = () => {
      if (editorIns) {
        editorIns = null
      }
    }

    const codeEditor = ref<HTMLElement>()
    const initEditor = () => {
      if (editorIns) {
        return
      }
      if (codeEditor.value) {
        editorIns = createEditor({
          dom: codeEditor.value,
          isDark: settingStore.isDark,
        })
      }
      if (!editorIns) {
        return
      }
      const data = isJSON(props.data) ? jsonFormat(props.data) : ''
      editorIns.setValue(data)

      const setFocus = () => {
        editorIns?.focus()
      }
      setTimeout(setFocus, 50)
    }
    const processing = ref(false)
    const handleImport = async () => {
      if (processing.value) {
        return
      }
      processing.value = true
      try {
        if (currentTab.value === ImportCategory.Text) {
          if (editorIns) {
            fileData.value = editorIns.getValue()
          } else {
            fileData.value = ''
          }
        }
        const topIDList = await importAPI({
          category: currentTab.value,
          collection: props.collection,
          fileData: fileData.value.trim(),
        })
        // If a directory is specified
        if (props.folder && topIDList.length) {
          await apiFolderStore.addChild({
            id: props.folder,
            children: topIDList,
          })
        }

        // Reload data to trigger a page refresh
        await apiFolderStore.fetch(props.collection)
        await apiSettingStore.fetch(props.collection)
        await useEnvironmentStore().fetch(props.collection)
        await useEnvironmentVariableStore().fetch(props.collection)
        message.info(i18nCollection('importSuccess'))

        if (props.onConfirm) {
          props.onConfirm()
        }
      } catch (err) {
        showError(message, err)
      } finally {
        processing.value = false
      }
    }

    const handleReadFile = (blob: Blob) => {
      const r = new FileReader()
      r.onload = () => {
        fileData.value = r.result as string
      }
      r.onerror = () => {
        fileData.value = ''
        showError(message, new Error('read file fail'))
      }
      r.readAsText(blob)
    }
    onBeforeUnmount(() => {
      destroyEditor()
    })
    return {
      currentTab,
      fileData,
      destroyEditor,
      initEditor,
      handleReadFile,
      handleImport,
      processing,
      codeEditor,
    }
  },
  render() {
    const { currentTab } = this
    const uploadWrapper = (
      <NUpload
        style={{
          height: `${importWrapperHeight}px`,
        }}
        onChange={(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
          this.handleReadFile(data.fileList[0].file as Blob)
        }}
      >
        <NUploadDragger>
          <div
            style={{
              marginBottom: '10px',
            }}
          >
            <NIcon size="48">
              <CloudUploadOutline />
            </NIcon>
          </div>
          <NText>{i18nCollection('dragUploadTips')}</NText>
        </NUploadDragger>
      </NUpload>
    )
    return (
      <div>
        <NTabs
          defaultValue={currentTab}
          onUpdateValue={(value) => {
            this.fileData = ''
            this.currentTab = value
          }}
        >
          <NTabPane
            name={ImportCategory.Text}
            tab="JSON / curl"
            onVnodeMounted={() => {
              this.initEditor()
            }}
            onVnodeUnmounted={() => {
              this.destroyEditor()
            }}
          >
            <div class={s.codeEditorClass}>
              <div ref="codeEditor" class={s.codeEditor}></div>
            </div>
          </NTabPane>
          <NTabPane name={ImportCategory.File} tab="File/Postman/Insonmia/Swagger">
            {uploadWrapper}
          </NTabPane>
        </NTabs>
        <div class="tar">
          <NButton
            loading={this.processing}
            onClick={() => {
              this.handleImport()
            }}
          >
            {i18nCommon('confirm')}
          </NButton>
        </div>
      </div>
    )
  },
})

export function newImportDialog(option: ImportDialogOption) {
  const { dialog, data, collection, folder } = option

  const d = dialog.info({
    title: i18nCollection('importSettings'),
    closable: false,
    style: getNormalDialogStyle(),
    content: () => (
      <ImportEditor
        data={data}
        collection={collection}
        folder={folder}
        onConfirm={() => {
          d.destroy()
        }}
      />
    ),
  })
}
