import { CloseCircle } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { defineComponent, nextTick, onMounted, PropType, ref, watch, type HTMLAttributes } from 'vue'
import s from './ExMultiColorInput.module.css'

type AutosizeOption = boolean | { minRows?: number; maxRows?: number }

type InputPropsLike = Record<string, unknown>

type HighlightRule = {
  regex: RegExp
  color: string
  priority?: number
  group?: number
}

const BUILTIN_RULES: HighlightRule[] = [
  {
    regex: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    group: 1,
    color: 'var(--ex-hl-fn, #c792ea)',
    priority: 0,
  },
  {
    regex: /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
    group: 1,
    color: 'var(--ex-hl-var, #a6e22e)',
    priority: 1,
  },
  {
    regex: /(["'])(?:(?=(\\?))\2.)*?\1/g,
    color: 'var(--ex-hl-str, #ffd866)',
    priority: 2,
  },
  {
    regex: /\b\d+(?:\.\d+)?\b/g,
    color: 'var(--ex-hl-num, #ff9d00)',
    priority: 3,
  },
  {
    regex: /\/[a-zA-Z0-9._-]+/g,
    color: 'var(--ex-hl-path, #7fdbca)',
    priority: 60,
  },
]

function escapeHtml(v: string): string {
  return v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function normalizeText(v: string, singleLine: boolean): string {
  let text = (v ?? '').replace(/\r\n/g, '\n')
  if (singleLine) text = text.replaceAll('\n', ' ')
  return text
}

function getGroupRange(m: RegExpExecArray, rule: HighlightRule): { start: number; end: number } | null {
  const groupIndex = rule.group ?? 0
  if (groupIndex <= 0) return null
  const gv = m[groupIndex]
  if (!gv) return null
  const full = m[0] ?? ''
  const idx = full.indexOf(gv)
  if (idx < 0) return null
  const start = (m.index ?? 0) + idx
  const end = start + gv.length
  return end > start ? { start, end } : null
}

type RangeMatch = { start: number; end: number; rule: HighlightRule }

function buildRanges(text: string, rules: HighlightRule[]): RangeMatch[] {
  const all: RangeMatch[] = []

  for (const r of rules) {
    if (!r.regex.global) continue
    r.regex.lastIndex = 0

    let m: RegExpExecArray | null
    while ((m = r.regex.exec(text)) !== null) {
      if (m.index == null) continue

      let start = m.index
      let end = start + (m[0]?.length ?? 0)

      const gr = getGroupRange(m, r)
      if (gr) {
        start = gr.start
        end = gr.end
      }

      if (end > start) all.push({ start, end, rule: r })
    }
  }

  all.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    const ap = a.rule.priority ?? 100
    const bp = b.rule.priority ?? 100
    if (ap !== bp) return ap - bp
    return b.end - b.start - (a.end - a.start)
  })

  const selected: RangeMatch[] = []
  let cursor = 0
  for (const it of all) {
    if (it.start < cursor) continue
    selected.push(it)
    cursor = it.end
  }
  return selected
}

function highlightToHtml(text: string, rules: HighlightRule[]): string {
  if (!text) return ''
  const ranges = buildRanges(text, rules)
  if (ranges.length === 0) return escapeHtml(text).replaceAll('\n', '<br>')

  let out = ''
  let pos = 0

  for (const r of ranges) {
    if (r.start > pos) out += escapeHtml(text.slice(pos, r.start))
    const chunk = escapeHtml(text.slice(r.start, r.end))
    out += `<span style="color:${r.rule.color};">${chunk}</span>`
    pos = r.end
  }

  if (pos < text.length) out += escapeHtml(text.slice(pos))
  return out.replaceAll('\n', '<br>')
}

function getCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return 0
  const pre = document.createRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

function setCaretOffset(root: HTMLElement, offset: number) {
  const sel = window.getSelection()
  if (!sel) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  let remaining = Math.max(0, offset)

  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      const r = document.createRange()
      r.setStart(node, remaining)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
      return
    }
    remaining -= len
    node = walker.nextNode()
  }

  const r = document.createRange()
  r.selectNodeContents(root)
  r.collapse(false)
  sel.removeAllRanges()
  sel.addRange(r)
}

function parseAutosize(a?: AutosizeOption) {
  if (a === true) return { enabled: true, minRows: 1, maxRows: undefined }
  if (a === false || a === undefined) return { enabled: false, minRows: 1, maxRows: undefined }
  return { enabled: true, minRows: Math.max(a.minRows ?? 1, 1), maxRows: a.maxRows }
}

export default defineComponent({
  name: 'ExMultiColorInput',
  props: {
    defaultValue: { type: String, default: '' },
    value: { type: String, default: undefined },
    type: { type: String as PropType<'text' | 'textarea'>, default: 'text' },
    autosize: { type: [Boolean, Object] as PropType<AutosizeOption>, default: false },
    inputProps: { type: Object as PropType<InputPropsLike>, default: () => ({}) },
    placeholder: { type: String, default: '' },
    clearable: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    onBlur: { type: Function as PropType<() => void>, default: undefined },
    onFocus: { type: Function as PropType<() => void>, default: undefined },
    onKeydown: { type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined },
    onUpdateValue: { type: Function as PropType<(v: string) => void>, default: undefined },
  },
  setup(props) {
    const editableRef = ref<HTMLDivElement | null>(null)
    const isFocused = ref(false)
    const innerValue = ref<string>(props.defaultValue ?? '')

    const getValue = () => (props.value != null ? props.value : innerValue.value)
    const setValue = (v: string) => {
      if (props.value == null) innerValue.value = v
      if (props.onUpdateValue) props.onUpdateValue(v)
    }

    const renderHighlighted = (text: string, preserveCaret: boolean) => {
      const el = editableRef.value
      if (!el) return

      const singleLine = props.type !== 'textarea'
      const normalized = normalizeText(text, singleLine)
      const nextHtml = highlightToHtml(normalized, BUILTIN_RULES) || ''
      const currentText = normalizeText(el.innerText, singleLine)

      if (currentText === normalized && el.innerHTML === nextHtml) {
        nextTick(updateAutosize)
        return
      }

      const caret = preserveCaret ? getCaretOffset(el) : 0
      el.innerHTML = nextHtml

      if (preserveCaret) {
        nextTick(() => {
          const node = editableRef.value
          if (!node) return
          setCaretOffset(node, Math.min(caret, normalized.length))
        })
      }

      nextTick(updateAutosize)
    }

    const syncDomFromValue = (preserveCaret: boolean) => {
      renderHighlighted(getValue(), preserveCaret)
    }

    const applyHighlightNow = () => {
      const el = editableRef.value
      if (!el) return

      const singleLine = props.type !== 'textarea'
      const text = normalizeText(el.innerText, singleLine)

      setValue(text)
      renderHighlighted(text, true)
    }

    const updateAutosize = () => {
      const { enabled, minRows, maxRows } = parseAutosize(props.autosize)
      if (!enabled) return
      if (props.type !== 'textarea') return

      const el = editableRef.value
      if (!el) return

      el.style.height = 'auto'
      const scrollH = el.scrollHeight
      const cs = getComputedStyle(el)
      const lineHeight = Number.parseFloat(cs.lineHeight || '20') || 20

      const minH = minRows * lineHeight + 12
      const maxH = maxRows ? maxRows * lineHeight + 12 : Infinity

      const h = Math.max(minH, Math.min(scrollH, maxH))
      el.style.height = `${h}px`
      el.style.overflowY = scrollH > maxH ? 'auto' : 'hidden'
    }

    const handleInput = () => {
      applyHighlightNow()
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (props.disabled || props.readonly) return
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') ?? ''
      document.execCommand('insertText', false, text)
      nextTick(applyHighlightNow)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (props.disabled || props.readonly) return

      if (props.type !== 'textarea' && e.key === 'Enter') {
        e.preventDefault()
      }

      if (props.onKeydown) props.onKeydown(e)
    }

    const clear = () => {
      setValue('')
      nextTick(() => syncDomFromValue(true))
    }

    watch(
      () => props.value,
      () => {
        syncDomFromValue(isFocused.value)
      },
    )

    onMounted(() => {
      syncDomFromValue(false)
    })

    return {
      editableRef,
      isFocused,
      getValue,
      clear,
      handleInput,
      handlePaste,
      handleKeyDown,
    }
  },
  render() {
    const { placeholder, disabled, readonly, clearable, type, inputProps, onBlur, onFocus } = this.$props

    const value = this.getValue()
    const singleLine = type !== 'textarea'

    return (
      <div class={[s.root, singleLine && s.rootSingleLine, disabled && s.disabled, readonly && s.readonly]}>
        {placeholder && !value && <div class={s.placeholder}>{placeholder}</div>}

        <div
          ref="editableRef"
          class={[s.editable, singleLine && s.singleLine]}
          contenteditable={!disabled && !readonly}
          spellcheck={false}
          {...(inputProps as HTMLAttributes)}
          onInput={() => this.handleInput()}
          onPaste={(e) => this.handlePaste(e as unknown as ClipboardEvent)}
          onKeydown={(e) => this.handleKeyDown(e as unknown as KeyboardEvent)}
          onFocus={() => {
            this.isFocused = true
            if (onFocus) onFocus()
          }}
          onBlur={() => {
            this.isFocused = false
            if (onBlur) onBlur()
          }}
        />

        {clearable && !disabled && !readonly && value ? (
          <span class={s.clear} onMousedown={(e) => e.preventDefault()} onClick={() => this.clear()} role="button" aria-label="clear">
            <NIcon size={18}>
              <CloseCircle />
            </NIcon>
          </span>
        ) : null}
      </div>
    )
  },
})
