import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

const workerByLabel: Record<string, () => Worker> = {
  json: () => new jsonWorker(),
  css: () => new cssWorker(),
  scss: () => new cssWorker(),
  less: () => new cssWorker(),
  html: () => new htmlWorker(),
  handlebars: () => new htmlWorker(),
  razor: () => new htmlWorker(),
  javascript: () => new tsWorker(),
  typescript: () => new tsWorker(),
}

const getWorker: NonNullable<monaco.Environment['getWorker']> = (moduleId, label) => {
  void moduleId
  return workerByLabel[label]?.() ?? new editorWorker()
}

type MonacoGlobal = typeof self & { MonacoEnvironment?: monaco.Environment }

const globalScope = self as MonacoGlobal

globalScope.MonacoEnvironment = {
  getWorker,
}

monaco.typescript.typescriptDefaults.setEagerModelSync(true)
