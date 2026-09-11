import type { KeyValue, RequestConfig } from '@shared/types'
import { buildAuth, kvListToRecord } from './authShared'

/** The languages we can generate client code for. */
export type CodeLanguage = 'curl' | 'javascript' | 'python' | 'node'

export const CODE_LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'curl', label: 'cURL' },
  { value: 'javascript', label: 'JavaScript (fetch)' },
  { value: 'python', label: 'Python (requests)' },
  { value: 'node', label: 'Node.js (axios)' }
]

interface FlatRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

/** Collapse a request config into URL + headers + body for codegen. */
export function flattenRequest(config: RequestConfig): FlatRequest {
  const auth = buildAuth(config.auth)
  const headers: Record<string, string> = { ...auth.headers }

  for (const row of config.headers) {
    if (!row.enabled || !row.key.trim()) continue
    headers[row.key] = row.value
  }

  const url = new URL(
    config.url.startsWith('http') ? config.url : `https://${config.url || 'example.com'}`
  )

  for (const [key, value] of Object.entries(auth.query)) {
    url.searchParams.append(key, value)
  }
  for (const row of config.params) {
    if (!row.enabled || !row.key.trim()) continue
    url.searchParams.append(row.key, row.value)
  }

  let body: string | undefined
  switch (config.body.type) {
    case 'json':
    case 'graphql':
      body = config.body.raw ?? undefined
      if (body && !hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json'
      break
    case 'raw':
      body = config.body.raw || undefined
      if (body && !hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = rawContentType(config.body.rawLanguage)
      }
      break
    case 'form': {
      const params = new URLSearchParams()
      for (const row of config.body.formData ?? []) {
        if (!row.enabled || !row.key.trim()) continue
        params.append(row.key, row.value)
      }
      body = params.toString()
      if (!hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      break
    }
    default:
      body = undefined
  }

  return { method: config.method, url: url.toString(), headers, body }
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase()
  return Object.keys(headers).some((k) => k.toLowerCase() === target)
}

function rawContentType(language: string | undefined): string {
  switch (language) {
    case 'json':
      return 'application/json'
    case 'xml':
      return 'application/xml'
    case 'html':
      return 'text/html'
    case 'javascript':
      return 'application/javascript'
    default:
      return 'text/plain'
  }
}

/* ------------------------------------------------------------------ */
/* cURL                                                                */
/* ------------------------------------------------------------------ */

function toCurl(request: FlatRequest): string {
  const parts = [`curl -X ${request.method} '${request.url}'`]

  for (const [key, value] of Object.entries(request.headers)) {
    parts.push(`  -H '${key}: ${value}'`)
  }

  if (request.body) {
    parts.push(`  -d '${request.body.replace(/'/g, `'\\''`)}'`)
  }

  return parts.join(' \\\n')
}

/* ------------------------------------------------------------------ */
/* JavaScript fetch                                                    */
/* ------------------------------------------------------------------ */

function toJavaScript(request: FlatRequest): string {
  const lines: string[] = []
  const init: string[] = [`  method: '${request.method}'`]

  if (Object.keys(request.headers).length) {
    const headerLines = Object.entries(request.headers)
      .map(([k, v]) => `    '${k}': '${escapeSingle(v)}'`)
      .join(',\n')
    init.push(`  headers: {\n${headerLines}\n  }`)
  }

  if (request.body) {
    init.push(`  body: JSON.stringify(${safeLiteral(request.body)})`)
  }

  lines.push(`const response = await fetch('${request.url}', {`)
  lines.push(init.join(',\n'))
  lines.push('})')
  lines.push('')
  lines.push('const data = await response.json()')
  lines.push('console.log(data)')

  return lines.join('\n')
}

/** Escape for embedding inside a single-quoted JS string. */
function escapeSingle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Parse the body as JSON so it can be re-serialised in generated code. */
function safeLiteral(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw))
  } catch {
    return JSON.stringify(raw)
  }
}

/* ------------------------------------------------------------------ */
/* Python requests                                                     */
/* ------------------------------------------------------------------ */

function toPython(request: FlatRequest): string {
  const lines = ['import requests', '']

  if (Object.keys(request.headers).length) {
    lines.push('headers = {')
    for (const [key, value] of Object.entries(request.headers)) {
      lines.push(`    "${key}": "${value.replace(/"/g, '\\"')}",`)
    }
    lines.push('}')
    lines.push('')
  }

  if (request.body) {
    lines.push(`payload = ${JSON.stringify(request.body)}`)
    lines.push('')
  }

  const args = [`"${request.url}"`]
  if (request.body) args.push('data=payload')
  if (Object.keys(request.headers).length) args.push('headers=headers')

  lines.push(`response = requests.${request.method.toLowerCase()}(${args.join(', ')})`)
  lines.push('print(response.status_code)')
  lines.push('print(response.text)')

  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Node axios                                                          */
/* ------------------------------------------------------------------ */

function toNode(request: FlatRequest): string {
  const lines = ["import axios from 'axios'", '']

  if (Object.keys(request.headers).length) {
    lines.push('const headers = {')
    for (const [key, value] of Object.entries(request.headers)) {
      lines.push(`  '${key}': '${escapeSingle(value)}',`)
    }
    lines.push('}')
    lines.push('')
  }

  if (request.body) {
    lines.push(`const data = ${safeLiteral(request.body)}`)
    lines.push('')
  }

  lines.push('const response = await axios({')
  lines.push(`  method: '${request.method}',`)
  lines.push(`  url: '${request.url}',`)
  if (request.body) lines.push('  data,')
  if (Object.keys(request.headers).length) lines.push('  headers,')
  lines.push('})')
  lines.push('')
  lines.push('console.log(response.data)')

  return lines.join('\n')
}

/** Generate a runnable snippet for the given language. */
export function generateCode(config: RequestConfig, language: CodeLanguage): string {
  const flat = flattenRequest(config)

  switch (language) {
    case 'curl':
      return toCurl(flat)
    case 'javascript':
      return toJavaScript(flat)
    case 'python':
      return toPython(flat)
    case 'node':
      return toNode(flat)
    default:
      return ''
  }
}

/** Export helper re-used by the request builder's "copy as" menu. */
export function enabledRows(rows: KeyValue[]): KeyValue[] {
  return rows.filter((row) => row.enabled && row.key.trim())
}

export { kvListToRecord }
