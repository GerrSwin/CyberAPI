import * as monaco from 'monaco-editor'

export function createEditor(params: { isDark: boolean; readonly?: boolean; dom: HTMLElement; minimap?: boolean }) {
  // * The current out-of-the-box available themes are: 'vs' (default), 'vs-dark', 'hc-black', 'hc-light.
  const e = monaco.editor.create(params.dom, {
    readOnly: params.readonly || false,
    language: 'json',
    theme: params.isDark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: {
      enabled: params.minimap ?? true,
    },
  })
  e.updateOptions({
    fontSize: 14,
    lineNumbersMinChars: 4,
    wordWrap: 'on',
  })
  return e
}

// Replace content
export function replaceContent(editor: monaco.editor.IStandaloneCodeEditor | null, content: string) {
  if (!editor) {
    return
  }
  editor.setValue(content || '')
}

// Collapse inner foldable regions (keep root level open)
export function foldAll(editor: monaco.editor.IStandaloneCodeEditor | null) {
  if (!editor) {
    return
  }
  // Prefer folding from level 2 so the root stays expanded
  const level2 = editor.getAction('editor.foldLevel2')
  if (level2) {
    level2.run()
    return
  }
  editor.getAction('editor.foldAll')?.run()
}

// Expand all foldable regions in the editor
export function unfoldAll(editor: monaco.editor.IStandaloneCodeEditor | null) {
  if (!editor) {
    return
  }
  editor.getAction('editor.unfoldAll')?.run()
}
