import { open } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, readFile, readTextFile, type ReadFileOptions } from '@tauri-apps/plugin-fs'
import md5 from 'crypto-js/md5'
import sha256 from 'crypto-js/sha256'
import { fromUint8Array } from 'js-base64'
import { get, toString, trim } from 'lodash-es'

import { i18nCommon } from '../i18n'
import { EnvironmentStatus, listEnvironment } from './environment'
import { getLatestResponse, getResponseBody } from './http_response'
import { listVariable, VariableCategory, VariableStatus } from './variable'

interface FnHandler {
  collection: string
  text: string
  fnList: string[]
  param: string | string[]
}

enum Fn {
  readTextFile = 'readTextFile',
  rtf = 'rtf',
  readFile = 'readFile',
  rf = 'rf',
  base64 = 'base64',
  b64 = 'b64',
  openFile = 'openFile',
  of = 'of',
  get = 'get',
  g = 'g',
  timestamp = 'timestamp',
  ts = 'ts',
  md5 = 'md5',
  sha256 = 'sha256',
  env = 'env',
  random = 'random',
}

function trimParam(param: string): string | string[] {
  const arr = param.split(',').map((item) => {
    item = item.trim()
    item = trim(item, "'")
    item = trim(item, '"')
    return item
  })

  // Replace single quotes with double quotes
  // const str = `[${param.replaceAll("'", '"')}]`;
  // const arr = JSON.parse(str);
  if (arr.length < 2) {
    return arr[0]
  }
  return arr
}

export function parseFunctions(collection: string, value: string): FnHandler[] {
  const reg = /\{\{([\s\S]+?)\}\}/g
  const parmaReg = /\(([\s\S]*?)\)/
  let result: RegExpExecArray | null
  const handlers: FnHandler[] = []
  while ((result = reg.exec(value)) !== null) {
    if (result.length !== 2) {
      break
    }
    const paramResult = parmaReg.exec(result[1])
    if (paramResult?.length !== 2) {
      break
    }
    const fnList = result[1].replace(paramResult[0], '').split('.')
    handlers.push({
      collection,
      text: result[0],
      fnList: fnList,
      param: trimParam(paramResult[1]),
    })
  }
  return handlers
}

interface FsParams {
  file: string
  option: ReadFileOptions
}

function getDir(dir: string): BaseDirectory {
  switch (dir.toLowerCase()) {
    case 'document':
      return BaseDirectory.Document
    case 'desktop':
      return BaseDirectory.Desktop
    default:
      return BaseDirectory.Download
  }
}

function convertToFsParams(p: unknown): FsParams {
  const option = {
    baseDir: BaseDirectory.Download,
  }
  let file = toString(p)
  if (Array.isArray(p)) {
    file = toString(p[0])
    if (p[1]) {
      option.baseDir = getDir(p[1])
    }
  }
  return {
    file,
    option,
  }
}

const sampleNames = [
  'Ava',
  'Liam',
  'Noah',
  'Mia',
  'Ethan',
  'Zoe',
  'Lucas',
  'Ivy',
  'Mason',
  'Luna',
  'Olivia',
  'Elijah',
  'Charlotte',
  'Amelia',
  'Harper',
  'Ella',
  'James',
  'Benjamin',
  'Henry',
  'Sophia',
  'Isabella',
  'Jack',
  'Leo',
  'Grace',
  'Aria',
  'Chloe',
  'Emma',
  'Scarlett',
  'Samuel',
  'Wyatt',
]

function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function randomName(prefix?: string): string {
  const name = sampleNames[Math.floor(Math.random() * sampleNames.length)]
  return prefix ? `${prefix}-${name}` : name
}

function randomEmail(domain?: string): string {
  const d = (domain || 'example.com').replace(/^@/, '')
  return `${Math.round(Date.now() / 1000)}${randomString()}@${d}`
}

function generateRandomValue(type: string, option?: string): string {
  switch (type.toLowerCase()) {
    case 'email':
      return randomEmail(option)
    case 'name':
      return randomName(option)
    default:
      return option || randomString(10)
  }
}

export async function doFnHandler(handler: FnHandler): Promise<string> {
  const { param, fnList, collection } = handler
  let p: unknown = param
  const size = fnList.length
  //   Process functions from back to front
  for (let index = size - 1; index >= 0; index--) {
    const fn = fnList[index]
    switch (fn) {
      case Fn.readTextFile:
      case Fn.rtf:
        {
          const params = convertToFsParams(p)
          p = await readTextFile(params.file, params.option)
        }
        break
      case Fn.md5:
        p = md5(toString(p)).toString()
        break
      case Fn.sha256:
        p = sha256(toString(p)).toString()
        break
      case Fn.readFile:
      case Fn.rf:
        {
          const params = convertToFsParams(p)
          p = await readFile(params.file, params.option)
        }
        break
      case Fn.base64:
      case Fn.b64:
        {
          p = fromUint8Array(p as Uint8Array)
        }
        break
      case Fn.openFile:
      case Fn.of:
        {
          const selected = await open({
            title: i18nCommon('selectFile'),
          })
          if (selected) {
            p = selected as string
          }
        }
        break
      case Fn.timestamp:
      case Fn.ts:
        {
          p = `${Math.round(Date.now() / 1000)}`
        }
        break
      case Fn.get:
      case Fn.g:
        {
          const arr = toString(p).split(',')
          if (arr.length !== 2) {
            throw new Error('params of get from response is invalid')
          }
          const resp = await getLatestResponse(arr[0].trim())
          if (resp) {
            const result = getResponseBody(resp)
            p = get(result.json, arr[1].trim())
          }
        }
        break
      case Fn.env:
        {
          const name = toString(p)
          const environments = await listEnvironment(collection)
          const activeEnvironmentId = environments.find((item) => item.enabled === EnvironmentStatus.Enabled)?.id || ''
          const [environmentVariables, customizeVariables] = await Promise.all([
            listVariable(collection, VariableCategory.Environment),
            listVariable(collection, VariableCategory.Customize),
          ])
          const variables = environmentVariables.concat(customizeVariables)
          let found = variables.find(
            (item) => item.enabled === VariableStatus.Enabled && item.name === name && item.environment === activeEnvironmentId,
          )
          if (!found && activeEnvironmentId) {
            found = variables.find((item) => item.enabled === VariableStatus.Enabled && item.name === name && !item.environment)
          }
          if (found) {
            p = found.value
          }
        }
        break
      case Fn.random:
        {
          const params = Array.isArray(p) ? p : [toString(p)]
          const type = toString(params[0] || '')
          const option = params.length > 1 ? toString(params[1]) : undefined
          p = generateRandomValue(type, option)
        }
        break
      default:
        break
    }
  }
  return toString(p)
}
