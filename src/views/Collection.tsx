import { debounce } from 'lodash-es'
import { useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { ulid } from 'ulid'
import { defineComponent, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import s from './Collection.module.css'

import { abortRequestID, doHTTPRequest } from '../commands/http_request'
import { HTTPResponse, getLatestResponse, onSelectResponse } from '../commands/http_response'
import APIResponse from '../components/APIResponse'
import APISettingParams from '../components/APISettingParams'
import APISettingTree from '../components/APISettingTree'
import ExColumn from '../components/ExColumn'
import ExLoading from '../components/ExLoading'
import { getBodyWidth, showError } from '../helpers/util'
import { useAPICollectionStore } from '../stores/api_collection'
import { useAPIFolderStore } from '../stores/api_folder'
import { useAPISettingStore } from '../stores/api_setting'
import { useEnvironmentStore, useEnvironmentVariableStore } from '../stores/environment'
import { useGlobalReqHeaderStore } from '../stores/global_req_header'
import { useHeaderStore } from '../stores/header'
import { usePinRequestStore } from '../stores/pin_request'
import { useSettingStore } from '../stores/setting'

export default defineComponent({
  name: 'CollectionView',
  setup() {
    const route = useRoute()
    const collection = route.query.collection as string
    const message = useMessage()
    const headerStore = useHeaderStore()
    const settingStore = useSettingStore()
    const apiFolderStore = useAPIFolderStore()
    const apiSettingStore = useAPISettingStore()
    const { collectionColumnWidths } = storeToRefs(settingStore)

    const { selectedID } = storeToRefs(apiSettingStore)
    const processing = ref(false)
    const sending = ref(false)
    const response = ref({} as HTTPResponse)
    const maxWidth = ref(window.innerWidth)

    const stop = watch(selectedID, async (id) => {
      const resp = await getLatestResponse(id)
      if (resp) {
        response.value = resp
      } else {
        // If a new API is selected, reset the data
        response.value = {
          api: id,
        } as HTTPResponse
      }
    })

    const handleResize = debounce(
      () => {
        // If the adjustment is too small, do not trigger
        if (Math.abs(maxWidth.value - window.innerWidth) >= 30) {
          maxWidth.value = window.innerWidth
        }
      },
      100,
      {
        leading: false,
        trailing: true,
      },
    )

    onBeforeMount(async () => {
      processing.value = true
      try {
        await usePinRequestStore().fetch(collection)
        await apiFolderStore.fetch(collection)
        await apiSettingStore.fetch(collection)
        await useEnvironmentStore().fetch(collection)
        await useEnvironmentVariableStore().fetch(collection)
        await useGlobalReqHeaderStore().fetch(collection)
        const collectionStore = useAPICollectionStore()
        const result = await collectionStore.get(collection)
        if (result) {
          headerStore.add({
            name: result.name,
            route: route.name as string,
          })
        }
        await collectionStore.fetchExpandedFolders(collection)
        await collectionStore.fetchTopTreeItems(collection)
        await collectionStore.fetchActiveTabs()

        if (apiSettingStore.selectedID) {
          const data = await getLatestResponse(apiSettingStore.selectedID)
          if (data) {
            response.value = data
          }
        }
        window.addEventListener('resize', handleResize)
      } catch (err) {
        showError(message, err)
      } finally {
        processing.value = false
      }
    })

    const updateCollectionColumnWidths = async (params: { restWidth: number; value: number; index: number }) => {
      const { index, value, restWidth } = params
      if (index < 1 || index > 2) {
        return
      }
      const widths = settingStore.collectionColumnWidths.slice(0)

      // First row is absolute value; others are percentages
      const widthIndex = index - 1
      if (index === 1) {
        widths[widthIndex] += value
      } else {
        widths[widthIndex] += value / restWidth
        if (widths[widthIndex] > 1.0) {
          widths[widthIndex] = 0.5
        }
      }
      try {
        await settingStore.updateCollectionColumnWidths(widths)
      } catch (err) {
        showError(message, err)
      }
    }
    let sendingRequestID = ''

    const createEmptyResponse = (api: string, req?: unknown) => {
      return {
        api,
        req,
        status: -1,
        headers: new Map<string, string[]>(),
        body: '',
        bodySize: 0,
        latency: 0,
        stats: {
          remoteAddr: '',
          isHttps: false,
          cipher: '',
          dnsLookup: 0,
          tcp: 0,
          tls: 0,
          send: 0,
          serverProcessing: 0,
          contentTransfer: 0,
          total: 0,
        },
      } as HTTPResponse
    }

    const isCurrentRequest = (reqID: string) => {
      return sendingRequestID === reqID
    }

    const handleSend = async (id: string) => {
      // Abort request
      if (id === abortRequestID) {
        sending.value = false
        sendingRequestID = ''
        const api = apiSettingStore.selectedID
        response.value = createEmptyResponse(api)
        return
      }
      if (sending.value) {
        return
      }
      const reqID = ulid()
      sendingRequestID = reqID
      const { req, originalReq } = apiSettingStore.getHTTPRequestFillValues(id)

      try {
        // Always clear previous response immediately on send.
        response.value = createEmptyResponse(id, req)
        sending.value = true
        const timeout = settingStore.getRequestTimeout()
        const res = await doHTTPRequest({
          id,
          collection,
          req,
          originalReq,
          timeout,
        })
        if (isCurrentRequest(reqID)) {
          response.value = res
        }
      } catch (err) {
        if (isCurrentRequest(reqID)) {
          response.value = {
            api: reqID,
            req,
          } as HTTPResponse
          showError(message, err)
        }
      } finally {
        if (isCurrentRequest(reqID)) {
          sending.value = false
        }
      }
    }

    const offListen = onSelectResponse((resp) => {
      // Do not allow a history selection to overwrite the in-flight UI.
      if (sending.value) {
        return
      }
      response.value = resp
    })

    onBeforeUnmount(() => {
      stop()
      offListen()
      usePinRequestStore().$reset()
      window.removeEventListener('resize', handleResize)
      // Clear selected id
      apiSettingStore.select('')
    })

    return {
      response,
      sending,
      collectionColumnWidths,
      processing,
      updateCollectionColumnWidths,
      handleSend,
      maxWidth,
    }
  },
  render() {
    const { processing, collectionColumnWidths, updateCollectionColumnWidths, response, maxWidth } = this
    if (processing) {
      return <ExLoading />
    }

    let currentWidth = 0
    const widths = collectionColumnWidths.slice(0)
    // Last column auto-resizes
    if (widths.length) {
      widths.push(0)
    }
    let restWidth = getBodyWidth()
    widths.forEach((width) => {
      // Absolute value
      if (width > 1) {
        restWidth = restWidth - width
      }
    })

    const columns = widths.map((width, index) => {
      if (width < 1) {
        width = Math.floor(restWidth * width)
      }
      let element = <div />
      if (index === 0) {
        element = <APISettingTree />
      } else if (index === 1) {
        element = (
          <APISettingParams
            onSend={(id) => {
              return this.handleSend(id)
            }}
          />
        )
      } else if (index === 2) {
        element = <APIResponse response={response} />
      }
      const column = (
        <ExColumn
          x-max-width={maxWidth}
          left={currentWidth}
          width={width}
          showDivider={index !== 0}
          onResize={(value) => {
            updateCollectionColumnWidths({
              restWidth,
              value,
              index,
            })
          }}
        >
          {element}
        </ExColumn>
      )
      currentWidth += width
      return column
    })

    return <div class={s.contentClass}>{columns}</div>
  },
})
