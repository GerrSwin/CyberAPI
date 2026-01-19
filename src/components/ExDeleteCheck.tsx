import { AlertCircleOutline, TrashOutline } from '@vicons/ionicons5'
import { NButton, NIcon } from 'naive-ui'
import { defineComponent, PropType, ref } from 'vue'
import s from './ExDeleteCheck.module.css'

// Clear on two quick clicks

export default defineComponent({
  name: 'ExDeleteCheck',
  props: {
    onConfirm: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    const deleting = ref(false)
    const handleClick = () => {
      if (!deleting.value) {
        deleting.value = true
      } else if (props.onConfirm) {
        props.onConfirm()
      }
    }

    return {
      handleClick,
      deleting,
    }
  },
  render() {
    const { deleting } = this
    return (
      <NButton
        quaternary
        onClick={() => {
          this.handleClick()
        }}
      >
        <NIcon class={deleting && s.checkClass}>
          {!deleting && <TrashOutline />}
          {deleting && <AlertCircleOutline />}
        </NIcon>
      </NButton>
    )
  },
})
