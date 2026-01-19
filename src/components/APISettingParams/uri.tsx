import { NButton, NInputGroup, NSelect } from 'naive-ui'
import { ulid } from 'ulid'
import { defineComponent, PropType, ref } from 'vue'
import ExMultiColorInput from '../../components/ExMultiColorInput/ExMultiColorInput'
import s from './uri.module.css'

import { HTTPMethod, HTTPRequest } from '../../commands/http_request'
import { i18nCollection } from '../../i18n'

export interface RequestURI {
  method: string
  uri: string
}

export default defineComponent({
  name: 'APISettingParamsURI',
  props: {
    params: {
      type: Object as PropType<HTTPRequest>,
      required: true,
    },
    onUpdateURI: {
      type: Function as PropType<(value: RequestURI) => void>,
      required: true,
    },
    onSubmit: {
      type: Function as PropType<(isAborted: boolean) => Promise<void>>,
      required: true,
    },
  },
  setup(props) {
    const currentURI = ref(props.params.uri || '')
    const method = ref(props.params.method)
    const sending = ref(false)

    const handleUpdate = () => {
      const uri = currentURI.value || ''
      const changed = uri !== props.params.uri || method.value !== props.params.method

      if (changed && props.onUpdateURI) {
        props.onUpdateURI({
          method: method.value,
          uri,
        })
      }
    }
    let currentID = ''
    const isCurrent = (id: string) => {
      return id === currentID
    }
    let lastHandleSendAt = 0
    const handleSend = async () => {
      if (!props.onSubmit) {
        return
      }
      const now = Date.now()
      // If clicked quickly
      // Ignore the second click
      if (now - lastHandleSendAt < 200) {
        return
      }
      lastHandleSendAt = now

      // Abort the request if sending
      if (sending.value) {
        sending.value = false
        currentID = ''
        await props.onSubmit(true)
        return
      }
      const id = ulid()
      currentID = id
      sending.value = true
      try {
        await props.onSubmit(false)
      } finally {
        // Only reset state for the current id
        if (isCurrent(id)) {
          sending.value = false
        }
      }
    }

    return {
      sending,
      handleSend,
      handleUpdate,
      method,
      currentURI,
    }
  },
  render() {
    const { currentURI, method } = this
    const options = [HTTPMethod.GET, HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH, HTTPMethod.DELETE, HTTPMethod.OPTIONS, HTTPMethod.HEAD].map(
      (item) => {
        return {
          label: item,
          value: item,
        }
      },
    )
    const autoSizeOption = { minRows: 1, maxRows: 3 }
    const inputProps = { spellcheck: false }

    //TODO Custom input field with support for multi-colored text
    return (
      <div class={s.wrapperClass}>
        <NInputGroup class={s.url}>
          <NSelect
            class={s.method}
            consistentMenuWidth={false}
            options={options}
            placeholder={''}
            defaultValue={method || HTTPMethod.GET}
            onUpdateValue={(value) => {
              this.method = value
              this.handleUpdate()
            }}
          />
          <ExMultiColorInput
            defaultValue={currentURI}
            type="textarea"
            autosize={autoSizeOption}
            inputProps={inputProps}
            placeholder={'http://test.com/users/v1/me'}
            onBlur={() => {
              this.handleUpdate()
            }}
            onUpdateValue={(value) => {
              this.currentURI = value?.trim()
            }}
            onKeydown={(e) => {
              if (e.key.toLowerCase() === 'enter' && this.currentURI) {
                this.handleSend()
                e.preventDefault()
              }
            }}
          />
          <NButton
            type="primary"
            class={s.submit}
            // loading={this.sending}
            onClick={() => {
              this.handleSend()
            }}
          >
            {this.sending ? i18nCollection('abort') : i18nCollection('send')}
          </NButton>
        </NInputGroup>
      </div>
    )
  },
})
