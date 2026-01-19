import { cloneDeep, debounce } from 'lodash-es'
import { NDivider, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { defineComponent, onBeforeUnmount, PropType, ref, VNode, watch } from 'vue'
import s from './index.module.css'

import { abortRequestID, HTTPRequest } from '../../commands/http_request'
import { onSelectResponse } from '../../commands/http_response'
import { KVParam } from '../../commands/interface'
import { showError } from '../../helpers/util'
import { i18nCollection } from '../../i18n'
import { useAPISettingStore } from '../../stores/api_setting'
import APISettingParamsReqParams from './req_params'
import APISettingParamsURI, { RequestURI } from './uri'

export default defineComponent({
  name: 'APISettingParams',
  props: {
    onSend: {
      type: Function as PropType<(id: string) => Promise<void>>,
      required: true,
    },
  },
  setup() {
    const message = useMessage()
    const apiSettingStore = useAPISettingStore()
    const { selectedID } = storeToRefs(apiSettingStore)

    const componentKey = ref(selectedID.value)
    const reqParams = ref({} as HTTPRequest)
    const reqParamsStyle = ref({
      height: '0px',
    })

    const wrapper = ref<Element>()
    let uriNodeHeight = 0
    const caclWrapperHeight = () => {
      const height = wrapper.value?.clientHeight || 0
      if (!height) {
        return
      }
      reqParamsStyle.value.height = `${height - uriNodeHeight}px`
    }

    const updateURINodeHeight = (node: VNode) => {
      uriNodeHeight = node.el?.clientHeight || 0
      caclWrapperHeight()
    }
    const updateReqParams = (id: string) => {
      try {
        if (id) {
          reqParams.value = apiSettingStore.getHTTPRequest(id)
        } else {
          reqParams.value = {} as HTTPRequest
        }
      } catch (err) {
        console.error(err)
      } finally {
        caclWrapperHeight()
      }
    }

    const stop = watch(selectedID, (id) => {
      componentKey.value = id
      updateReqParams(id)
    })
    if (selectedID.value) {
      updateReqParams(selectedID.value)
    }

    const offListen = onSelectResponse((resp) => {
      reqParams.value = cloneDeep(resp.req)
      caclWrapperHeight()
      const id = resp.id || `${Date.now()}`
      componentKey.value = `${selectedID.value}-${id}`
    })

    onBeforeUnmount(() => {
      offListen()
      stop()
    })
    const update = async () => {
      const id = selectedID.value
      if (!id) {
        message.warning(i18nCollection('shouldSelectAPISettingFirst'))
        return
      }
      const data = apiSettingStore.findByID(id)
      if (!data) {
        return
      }
      try {
        let value = ''
        if (reqParams.value) {
          value = JSON.stringify(reqParams.value)
        }
        data.setting = value
        await apiSettingStore.updateByID(id, data)
      } catch (err) {
        showError(message, err)
      }
    }
    const handleUpdateURI = async (data: RequestURI) => {
      Object.assign(reqParams.value, data)
      await update()
    }

    const handleUpdateBody = async (
      id: string,
      params: {
        body: string
        contentType: string
      },
    ) => {
      // Because this runs with a delay, do not update if already switched
      // Avoid updating other API data
      if (id !== selectedID.value) {
        return
      }
      reqParams.value.contentType = params.contentType
      reqParams.value.body = params.body
      await update()
    }

    const newHandleUpdate = (key: string) => {
      return async (id: string, data: KVParam[]) => {
        // Because this runs with a delay, do not update if already switched
        // Avoid updating other API data
        if (id !== selectedID.value) {
          return
        }
        reqParams.value[key] = data
        await update()
      }
    }

    const handleUpdateAuth = debounce(newHandleUpdate('auth'), 300)

    const handleUpdateQuery = debounce(newHandleUpdate('query'), 300)

    const handleUpdateHeaders = debounce(newHandleUpdate('headers'), 300)

    return {
      componentKey,
      reqParamsStyle,
      updateURINodeHeight,
      wrapper,
      selectedID,
      reqParams,
      // Avoid frequent repeated triggers; do not set too long
      // If set too long, updates may not take effect in time
      handleUpdateAuth,
      handleUpdateBody: debounce(handleUpdateBody, 300),
      handleUpdateURI,
      handleUpdateQuery,
      handleUpdateHeaders,
    }
  },
  render() {
    const { reqParams, selectedID, componentKey } = this

    return (
      <div class={s.wrapperClass} key={`uri-${componentKey}`} ref="wrapper">
        <APISettingParamsURI
          onVnodeMounted={(node) => {
            this.updateURINodeHeight(node)
          }}
          onVnodeUpdated={(node) => {
            this.updateURINodeHeight(node)
          }}
          params={reqParams}
          onUpdateURI={(data) => {
            this.handleUpdateURI(data)
          }}
          onSubmit={(isAborted: boolean) => {
            if (isAborted) {
              return this.$props.onSend(abortRequestID)
            }
            return this.$props.onSend(selectedID)
          }}
        />
        <NDivider />
        <APISettingParamsReqParams
          key={`params-${componentKey}`}
          style={this.reqParamsStyle}
          id={selectedID}
          params={reqParams}
          onUpdateBody={(value) => {
            this.handleUpdateBody(selectedID, value)
          }}
          onUpdateAuth={(value) => {
            this.handleUpdateAuth(selectedID, value)
          }}
          onUpdateQuery={(value) => {
            this.handleUpdateQuery(selectedID, value)
          }}
          onUpdateHeaders={(value) => {
            this.handleUpdateHeaders(selectedID, value)
          }}
        />
      </div>
    )
  },
})
