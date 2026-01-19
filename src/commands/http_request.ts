import { getTauriVersion, getVersion } from '@tauri-apps/api/app'
import { readFile } from '@tauri-apps/plugin-fs'
import { arch, type, version } from '@tauri-apps/plugin-os'
import { FormDataEncoder } from 'form-data-encoder'
import { encode, fromUint8Array } from 'js-base64'
import { forEach, isArray } from 'lodash-es'
import { ulid } from 'ulid'

import mime from 'mime'
import { delay, formatError, isWebMode } from '../helpers/util'
import { Cookie } from './cookies'
import { doFnHandler, parseFunctions } from './fn'
import { HTTPResponse, addLatestResponse } from './http_response'
import { KVParam } from './interface'
import { cmdDoHTTPRequest, run } from './invoke'

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export enum ContentType {
  JSON = 'application/json',
  Form = 'application/x-www-form-urlencoded',
  Multipart = 'multipart/form-data',
  XML = 'application/xml',
  Plain = 'text/plain',
}

export interface RequestTimeout {
  [key: string]: unknown
  connect: number
  write: number
  read: number
}

export interface HTTPRequest {
  [key: string]: unknown
  method: string
  uri: string
  body: string
  contentType: string
  headers: KVParam[]
  query: KVParam[]
  auth: KVParam[]
}

function convertKVListToURLValues(kvList: KVParam[]) {
  if (!kvList || kvList.length === 0) {
    return []
  }
  const arr: string[] = []
  kvList.forEach((kv) => {
    if (!kv.enabled) {
      return
    }
    arr.push(`${kv.key}=${encodeURIComponent(kv.value)}`)
  })
  return arr
}

export async function convertRequestToCURL(collection: string, req: HTTPRequest, cookies: Cookie[]) {
  await convertKVParams(collection, req.query)
  await convertKVParams(collection, req.headers)
  const queryList = convertKVListToURLValues(req.query)

  let uri = await replaceFunctions(collection, req.uri)
  if (queryList.length !== 0) {
    if (uri.includes('?')) {
      uri += `&${queryList.join('&')}`
    } else {
      uri += `?${queryList.join('&')}`
    }
  }

  const headerList: string[] = []
  const host = new URL(uri).host
  const cookieValues: string[] = []
  cookies.forEach((item) => {
    if (host.includes(item.domain)) {
      cookieValues.push(`${item.name}=${item.value}`)
    }
  })
  if (cookieValues.length) {
    headerList.push(`-H 'Cookie: ${cookieValues.join('; ')}'`)
  }

  let includeContentType = false
  req.headers?.forEach((kv) => {
    if (!kv.enabled) {
      return
    }
    if (kv.key.toLowerCase() === 'content-type') {
      includeContentType = true
    }
    headerList.push(`-H '${kv.key}: ${kv.value}'`)
  })
  if (!includeContentType && req.contentType) {
    headerList.push(`-H 'Content-Type: ${req.contentType}'`)
  }
  let body = ' '
  if (req.body) {
    body = await convertBody(collection, req.body)
    switch (req.contentType) {
      case ContentType.JSON:
        body = JSON.stringify(JSON.parse(body))
        break
      case ContentType.Form:
        {
          const arr: KVParam[] = JSON.parse(body)
          body = convertKVListToURLValues(arr).join('&')
        }
        break
      default:
        break
    }
    body = ` -d '${body}' `
  }
  const method = req.method || 'GET'
  return `curl -v -X${method.toUpperCase()}${body}${headerList.join(' ')} '${uri}'`
}

function is_json(str: string) {
  const value = str.trim()
  if (value.length < 2) {
    return false
  }
  const key = value[0] + value[value.length - 1]
  return key === '{}' || key === '[]'
}

async function replaceFunctions(collection: string, value: string) {
  const handlers = parseFunctions(collection, value)
  if (handlers.length === 0) {
    return value
  }
  let result = value
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i]
    const handlerResult = await doFnHandler(handler)
    result = result.replace(handler.text, handlerResult)
  }
  return result
}

async function convertBody(collection: string, data: string) {
  let body = data
  // Handle comments
  if (is_json(body)) {
    const arr = body.split('\n').filter((item) => {
      if (item.trim().startsWith('//')) {
        return false
      }
      return true
    })
    body = arr.join('\n')
  }

  return replaceFunctions(collection, body)
}

export async function convertKVParams(collection: string, params: KVParam[]) {
  if (!params || params.length === 0) {
    return
  }
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    param.value = await replaceFunctions(collection, param.value)
  }
}

export const abortRequestID = ulid()

interface MultipartFormData {
  headers: {
    'Content-Type': string
    'Content-Length'?: string
  }
  body: string
}

async function convertMultipartForm(body: string): Promise<MultipartFormData> {
  const arr = JSON.parse(body) as KVParam[]
  const form = new FormData()
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (!item.enabled || !item.key) {
      continue
    }
    const fileProtocol = 'file://'
    if (item.value.startsWith(fileProtocol)) {
      const file = item.value.substring(fileProtocol.length)
      const fileData = await readFile(file)
      const bytes = new Uint8Array(fileData.byteLength)
      bytes.set(fileData)
      form.append(
        item.key,
        new Blob([bytes], {
          type: mime.getType(file) || '',
        }),
        file,
      )
      continue
    }

    form.append(item.key, item.value)
  }
  // eslint-disable-next-line
  // @ts-ignore
  const encoder = new FormDataEncoder(form)
  // eslint-disable-next-line
  // @ts-ignore
  const b = new Blob(encoder, {
    type: encoder.contentType,
  })
  const buf = await b.arrayBuffer()
  return {
    headers: encoder.headers,
    body: fromUint8Array(new Uint8Array(buf)),
  }
}

export async function getUserAgent() {
  const appVersion = await getVersion()
  const appOS = await type()
  const appOSVersion = await version()
  const appArch = await arch()
  const tauriVersion = await getTauriVersion()
  return `CyberAPI/${appVersion} (${appOS}; tauri/${tauriVersion}; ${appOSVersion}; ${appArch})`
}

// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)
let userAgent = ''

export async function doHTTPRequest(options: {
  id: string
  collection: string
  req: HTTPRequest
  originalReq: HTTPRequest
  timeout: RequestTimeout
}): Promise<HTTPResponse> {
  const { id, collection, req, originalReq, timeout } = options
  if (!req.headers) {
    req.headers = []
  }
  if (!req.query) {
    req.query = []
  }
  if (!req.auth) {
    req.auth = []
  }
  const method = req.method || HTTPMethod.GET
  let body = req.body || ''
  let contentType = req.contentType || ''
  // For other request types, set body to empty
  if (![HTTPMethod.POST, HTTPMethod.PATCH, HTTPMethod.PUT].includes(method as HTTPMethod)) {
    body = ''
    contentType = ''
  }
  body = await convertBody(collection, body)
  // If it's a form
  if (body && contentType === ContentType.Form) {
    const arr = JSON.parse(body) as KVParam[]
    const result: string[] = []
    arr.forEach((item) => {
      if (!item.enabled) {
        return
      }
      result.push(`${window.encodeURIComponent(item.key)}=${window.encodeURIComponent(item.value)}`)
    })
    body = result.join('&')
  }
  if (body && contentType === ContentType.Multipart) {
    const data = await convertMultipartForm(body)
    contentType = data.headers['Content-Type']
    body = data.body
  }
  const params = {
    method: method,
    uri: await replaceFunctions(collection, req.uri),
    body,
    contentType,
    headers: req.headers,
    query: req.query,
  }
  await convertKVParams(collection, params.query)
  await convertKVParams(collection, params.headers)
  if (isWebMode()) {
    const ms = Math.random() * 2000
    await delay(ms)
    const headers = new Map<string, string[]>()
    headers.set('content-type', ['application/json'])
    headers.set('set-cookie', ['uid=ZHGG9VYP; path=/; httponly'])
    const resp = {
      api: id,
      req: req,
      latency: Math.ceil(ms),
      status: 200,
      bodySize: 0,
      headers,
      body: encode(JSON.stringify(params)),
      stats: {
        isHttps: false,
        cipher: '',
        remoteAddr: '127.0.0.1:80',
        dnsLookup: 1,
        tcp: 2,
        tls: 3,
        send: 0,
        serverProcessing: 4,
        contentTransfer: 5,
        total: 20,
      },
    }

    addLatestResponse(resp)
    return Promise.resolve(resp)
  }

  if (!userAgent) {
    userAgent = await getUserAgent()
  }

  params.headers.push({
    key: 'User-Agent',
    value: userAgent,
    enabled: true,
  })

  const auth = req.auth.filter((item) => item.enabled)
  if (auth.length) {
    const value = encode(`${auth[0].key}:${auth[0].value}`)
    params.headers.push({
      key: 'Authorization',
      value: `Basic ${value}`,
      enabled: true,
    })
  }

  const requestTimeout = {
    connect: 10,
    write: 120,
    read: 300,
  }
  if (timeout.connect && timeout.connect > 0) {
    requestTimeout.connect = timeout.connect
  }
  if (timeout.write && timeout.write > 0) {
    requestTimeout.write = timeout.write
  }
  if (timeout.read && timeout.read > 0) {
    requestTimeout.read = timeout.read
  }
  // eslint-disable-next-line
  // @ts-ignore
  let resp: HTTPResponse = {}

  const startedAt = Date.now()
  try {
    resp = await run<HTTPResponse>(cmdDoHTTPRequest, {
      req: params,
      api: id,
      timeout: requestTimeout,
    })
  } catch (err) {
    resp.body = formatError(err)
    resp.latency = Date.now() - startedAt
  }
  if (resp.latency <= 0) {
    resp.latency = 1
  }
  // Convert to Map<string, string[]>
  const headers = new Map<string, string[]>()
  forEach(resp.headers, (value, key) => {
    const k = key.toString()
    if (isArray(value)) {
      headers.set(k, value)
    } else {
      headers.set(k, [value as string])
    }
  })

  resp.req = originalReq
  resp.headers = headers
  addLatestResponse(resp)
  return resp
}
