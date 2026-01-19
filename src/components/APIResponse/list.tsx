import { isNumber } from 'lodash-es'
import { NButton, NDivider, NDropdown, NIcon, NP, NSpace, useMessage } from 'naive-ui'
import prettyBytes from 'pretty-bytes'
import s from './list.module.css'

import { ListOutline, TrashOutline } from '@vicons/ionicons5'
import { DropdownMixedOption } from 'naive-ui/es/dropdown/src/interface'
import { defineComponent, PropType, ref } from 'vue'
import { clearLatestResponseList, getLatestResponseList, Response, selectResponse } from '../../commands/http_response'
import { formatSimpleDate, showError } from '../../helpers/util'
import { i18nStore } from '../../i18n'

export default defineComponent({
  name: 'APIResponseList',
  props: {
    id: {
      type: String,
      required: true,
    },
    collapseAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    expandAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    foldDisabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const message = useMessage()
    const responseList = ref([] as Response[])

    const handleFetch = async () => {
      responseList.value.length = 0
      try {
        const arr = await getLatestResponseList(props.id)
        responseList.value = arr
      } catch (err) {
        showError(message, err)
      }
    }
    const handleSelect = (index: number) => {
      const resp = responseList.value[index]
      if (resp) {
        selectResponse(resp.resp)
      }
    }
    const handleClearHistory = async () => {
      try {
        await clearLatestResponseList(props.id)
        message.info(i18nStore('clearHistorySuccess'))
        responseList.value.length = 0
      } catch (err) {
        showError(message, err)
      }
    }
    return {
      responseList,
      handleFetch,
      handleSelect,
      handleClearHistory,
    }
  },
  render() {
    const { responseList, collapseAll, expandAll, foldDisabled } = this
    const options: DropdownMixedOption[] = responseList.map((item, index) => {
      let bodySize = '--'
      if (item.resp && isNumber(item.resp.bodySize)) {
        bodySize = prettyBytes(item.resp.bodySize)
      }
      return {
        label: () => (
          <NSpace>
            {item.resp.status}
            {bodySize}
            {formatSimpleDate(item.createdAt)}
          </NSpace>
        ),
        key: index,
      }
    })
    const clearHistorySlots = {
      icon: () => (
        <NIcon>
          <TrashOutline />
        </NIcon>
      ),
    }

    const clearBtn = responseList?.length !== 0 && (
      <NButton
        class="widthFull"
        v-slots={clearHistorySlots}
        quaternary
        onClick={() => {
          this.handleClearHistory()
        }}
      >
        {i18nStore('clearHistory')}
      </NButton>
    )

    const tips = responseList?.length === 0 && (
      <NP
        style={{
          margin: '5px 15px',
        }}
      >
        {i18nStore('noHistory')}
      </NP>
    )
    options.unshift({
      key: 'header',
      type: 'render',
      render: () => (
        <div>
          {clearBtn}
          <NDivider
            titlePlacement="left"
            style={{
              margin: '5px 0',
              'font-size': '12px',
            }}
          >
            {i18nStore('responseList')}
          </NDivider>
          {tips}
        </div>
      ),
    })
    const collapseBtn = (
      <NButton
        class={s.actionBtn}
        size="small"
        quaternary
        disabled={!collapseAll || foldDisabled}
        onClick={() => {
          collapseAll?.()
        }}
      >
        {i18nStore('collapseAll')}
      </NButton>
    )
    const expandBtn = (
      <NButton
        class={s.actionBtn}
        size="small"
        quaternary
        disabled={!expandAll || foldDisabled}
        onClick={() => {
          expandAll?.()
        }}
      >
        {i18nStore('expandAll')}
      </NButton>
    )
    return (
      <NSpace align="center" size={6} class={s.actions}>
        {collapseBtn}
        {expandBtn}
        <NDropdown
          trigger="click"
          placement="bottom-end"
          onSelect={(value) => {
            this.handleSelect(value)
          }}
          onUpdateShow={(value) => {
            if (value) {
              this.handleFetch()
            }
          }}
          options={options}
          showArrow={true}
        >
          <NIcon class={s.showMoreClass} size={20}>
            <ListOutline />
          </NIcon>
        </NDropdown>
      </NSpace>
    )
  },
})
