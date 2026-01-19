import { downloadDir } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { CheckboxOutline, DocumentOutline, SquareOutline } from '@vicons/ionicons5'
import { debounce } from 'lodash-es'
import { NButton, NGi, NGrid, NIcon, NInput, useMessage } from 'naive-ui'
import { ulid } from 'ulid'
import { defineComponent, PropType, ref, watch } from 'vue'
import s from './ExKeyValue.module.css'

import { KVParam } from '../commands/interface'
import { padding } from '../constants/style'
import { showError } from '../helpers/util'
import { i18nCollection, i18nCommon } from '../i18n'
import ExDeleteCheck from './ExDeleteCheck'

export enum HandleOptionCategory {
  Update = 'update',
  Add = 'add',
  Delete = 'delete',
}
export interface HandleOption {
  category: string
  index: number
  param?: KVParam
  params: KVParam[]
}

type KVItem = {
  id: string
  isNew: boolean
} & KVParam

export default defineComponent({
  name: 'ExKeyValue',
  props: {
    params: {
      type: Array as PropType<KVParam[]>,
      required: true,
    },
    spans: {
      type: Array as PropType<number[]>,
      default: () => [12, 12],
    },
    onHandleParam: {
      type: Function as PropType<(opt: HandleOption) => void>,
      required: true,
    },
    typeList: {
      type: Array as PropType<('textarea' | 'text' | 'password')[]>,
      default: () => ['textarea', 'textarea'],
    },
    supportFileSelect: {
      type: Boolean,
      default: () => false,
    },
  },
  setup(props) {
    const message = useMessage()
    const buildList = (params: KVParam[]) => {
      return params.map((item) => {
        return Object.assign(
          {
            id: ulid(),
            isNew: false,
          },
          item,
        )
      })
    }
    const kvList = ref(buildList(props.params) as KVItem[])
    const isSameParams = (params: KVParam[], list: KVItem[]) => {
      if (params.length !== list.length) {
        return false
      }
      for (let i = 0; i < params.length; i++) {
        const source = params[i]
        const target = list[i]
        if (source.key !== target.key || source.value !== target.value || source.enabled !== target.enabled) {
          return false
        }
      }
      return true
    }
    watch(
      () => props.params,
      (next) => {
        if (isSameParams(next, kvList.value)) {
          return
        }
        kvList.value = buildList(next)
      },
      { deep: true },
    )
    const addParams = (item: KVItem) => {
      kvList.value.push(item)
    }
    const handle = (opt: HandleOption) => {
      if (props.onHandleParam) {
        props.onHandleParam(opt)
      }
    }
    const toggleEnabled = (index: number) => {
      if (index >= kvList.value.length) {
        return
      }
      const item = kvList.value[index]
      item.enabled = !item.enabled
      if (item.key && item.value) {
        handle({
          category: HandleOptionCategory.Update,
          param: item,
          index,
          params: kvList.value,
        })
      }
    }

    const handleUpdate = (index: number) => {
      if (index >= kvList.value.length) {
        return
      }
      const item = kvList.value[index]
      let category = HandleOptionCategory.Update
      if (item.isNew) {
        category = HandleOptionCategory.Add
        item.isNew = false
      }
      handle({
        category,
        param: item,
        index,
        params: kvList.value,
      })
    }
    const deleteParams = (index: number) => {
      const items = kvList.value.splice(index, 1)
      // If it's a new item not yet in the database, ignore it
      if (items.length && items[0].isNew) {
        return
      }

      handle({
        category: HandleOptionCategory.Delete,
        index,
        params: kvList.value,
      })
    }
    const selectFile = async (index: number) => {
      if (index >= kvList.value.length) {
        return
      }
      try {
        const selected = await open({
          title: i18nCommon('selectFile'),
          multiple: false,
          defaultPath: await downloadDir(),
        })
        if (selected) {
          const item = kvList.value[index]
          item.value = ('file://' + selected) as string
          item.id = ulid()
          kvList.value[index] = item
        }
        handleUpdate(index)
      } catch (err) {
        showError(message, err)
      }
    }
    return {
      kvList,
      handleUpdate,
      selectFile,
      toggleEnabled,
      deleteParams,
      addParams,
    }
  },
  render() {
    const { spans, typeList, supportFileSelect } = this.$props
    const { kvList } = this
    const arr = kvList.slice(0)
    const lastItem: KVItem = {
      id: ulid(),
      key: '',
      value: '',
      enabled: true,
      isNew: true,
    }
    arr.push(lastItem)
    const namePlaceholder = i18nCollection('namePlaceholder')
    const valuePlaceholder = i18nCollection('valuePlaceholder')
    const size = arr.length
    const inputDebounce = 200
    const kvCls = [s.kv]
    if (supportFileSelect) {
      kvCls.push(s.withFile)
    }
    const list = arr.map((item, index) => {
      const isLast = index === size - 1
      const handleFocus = () => {
        // Click the last item to add
        if (isLast) {
          this.addParams(lastItem)
        }
      }
      return (
        <div class={s.item} key={item.id}>
          {!isLast && (
            <div class={s.btns}>
              {supportFileSelect && (
                <NButton
                  quaternary
                  onClick={() => {
                    this.selectFile(index)
                  }}
                >
                  <NIcon>
                    <DocumentOutline />
                  </NIcon>
                </NButton>
              )}
              <NButton
                quaternary
                onClick={() => {
                  this.toggleEnabled(index)
                }}
              >
                <NIcon>
                  {item.enabled && <CheckboxOutline />}
                  {!item.enabled && <SquareOutline />}
                </NIcon>
              </NButton>
              <ExDeleteCheck
                onConfirm={() => {
                  this.deleteParams(index)
                }}
              />
            </div>
          )}
          <div class={kvCls}>
            <NGrid yGap={padding} xGap={padding}>
              <NGi span={spans[0] || 12}>
                <NInput
                  type={typeList[0]}
                  autosize={true}
                  placeholder={namePlaceholder}
                  onFocus={handleFocus}
                  clearable
                  defaultValue={arr[index].key}
                  onUpdateValue={debounce((value) => {
                    arr[index].key = value
                    this.handleUpdate(index)
                  }, inputDebounce)}
                ></NInput>
              </NGi>
              <NGi span={spans[1] || 12}>
                <NInput
                  type={typeList[1]}
                  autosize={true}
                  placeholder={valuePlaceholder}
                  onFocus={handleFocus}
                  showPasswordOn="click"
                  clearable
                  defaultValue={arr[index].value}
                  onUpdateValue={debounce((value) => {
                    arr[index].value = value
                    this.handleUpdate(index)
                  }, inputDebounce)}
                ></NInput>
              </NGi>
            </NGrid>
          </div>
        </div>
      )
    })
    return <div class={s.kvClass}>{list}</div>
  },
})
