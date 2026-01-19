export interface ParsedCurlHeader {
  key: string
  value: string
  enabled: boolean
}

export interface ParsedCurlQuery {
  key: string
  value: string
  enabled: boolean
}

export interface ParsedCurlResult {
  method: string
  uri: string
  body?: string
  contentType: string
  headers: ParsedCurlHeader[]
  query: ParsedCurlQuery[]
  auth: unknown[]
}

export default function parseCurl(text: string): ParsedCurlResult
