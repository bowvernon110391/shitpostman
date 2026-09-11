import type {
  AuthConfig,
  BodyConfig,
  BodyType,
  Collection,
  CollectionItem,
  Folder,
  HttpMethod,
  KeyValue,
  RawLanguage,
  RequestConfig,
  SavedRequest
} from '../shared/types'
import { createId, isEnabled } from './utils'

const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function kv(key: string, value: string, enabled = true): KeyValue {
  return { id: createId('kv_'), key, value, enabled }
}

/** Postman stores auth/url rows as {key,value} arrays; index them by key. */
function indexByKey(rows: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!Array.isArray(rows)) return out
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const { key, value } = row as { key?: unknown; value?: unknown }
    if (typeof key === 'string') out[key] = typeof value === 'string' ? value : String(value ?? '')
  }
  return out
}

/** Accepts either a plain URL string or Postman's URL object form. */
function parseUrl(raw: unknown): { url: string; params: KeyValue[] } {
  if (typeof raw === 'string') {
    return { url: raw, params: [] }
  }
  if (!raw || typeof raw !== 'object') {
    return { url: '', params: [] }
  }

  const urlObj = raw as {
    raw?: string
    protocol?: string
    host?: string[] | string
    path?: string[] | string
    port?: string
    query?: { key?: string; value?: string; disabled?: boolean }[]
    variable?: { key?: string; value?: string }[]
  }

  let url = urlObj.raw ?? ''

  if (!url) {
    const protocol = urlObj.protocol ? `${urlObj.protocol}://` : ''
    const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host ?? '')
    const port = urlObj.port ? `:${urlObj.port}` : ''
    const path = Array.isArray(urlObj.path) ? `/${urlObj.path.join('/')}` : (urlObj.path ?? '')
    url = `${protocol}${host}${port}${path}`
  }

  // Strip the query string off the raw URL — we track params separately.
  const qIndex = url.indexOf('?')
  if (qIndex !== -1) url = url.slice(0, qIndex)

  const params: KeyValue[] = []
  for (const q of urlObj.query ?? []) {
    if (!q || typeof q.key !== 'string') continue
    params.push(kv(q.key, q.value ?? '', !q.disabled))
  }

  return { url, params }
}

function parseAuth(raw: unknown): AuthConfig {
  if (!raw || typeof raw !== 'object') return { type: 'none' }
  const { type } = raw as { type?: string }

  switch (type) {
    case 'bearer': {
      const fields = indexByKey((raw as Record<string, unknown>).bearer)
      return { type: 'bearer', bearerToken: fields.token ?? '' }
    }
    case 'basic': {
      const fields = indexByKey((raw as Record<string, unknown>).basic)
      return {
        type: 'basic',
        basicUsername: fields.username ?? '',
        basicPassword: fields.password ?? ''
      }
    }
    case 'apikey': {
      const fields = indexByKey((raw as Record<string, unknown>).apikey)
      const location = fields.in === 'query' ? 'query' : 'header'
      return {
        type: 'apikey',
        apiKeyName: fields.key ?? '',
        apiKeyValue: fields.value ?? '',
        apiKeyIn: location
      }
    }
    default:
      return { type: 'none' }
  }
}

function parseBody(raw: unknown): BodyConfig {
  if (!raw || typeof raw !== 'object') return { type: 'none' }
  const body = raw as {
    mode?: string
    raw?: string
    urlencoded?: { key?: string; value?: string; disabled?: boolean }[]
    formdata?: { key?: string; value?: string; disabled?: boolean; type?: string }[]
    graphql?: { query?: string; variables?: string }
    options?: { raw?: { language?: string } }
  }

  const toRows = (
    rows: { key?: string; value?: string; disabled?: boolean }[] | undefined
  ): KeyValue[] => {
    const out: KeyValue[] = []
    for (const row of rows ?? []) {
      if (typeof row?.key !== 'string') continue
      out.push(kv(row.key, row.value ?? '', !row.disabled))
    }
    return out
  }

  switch (body.mode) {
    case 'raw': {
      const language = (body.options?.raw?.language ?? 'text') as RawLanguage
      const normalised: RawLanguage = ['json', 'text', 'xml', 'html', 'javascript'].includes(
        language
      )
        ? language
        : 'text'
      return {
        type: normalised === 'json' ? 'json' : 'raw',
        raw: body.raw ?? '',
        rawLanguage: normalised
      }
    }
    case 'urlencoded':
      return { type: 'form', formData: toRows(body.urlencoded) }
    case 'formdata':
      return { type: 'form', formData: toRows(body.formdata) }
    case 'graphql': {
      const query = body.graphql?.query ?? ''
      const variables = body.graphql?.variables ?? ''
      const payload =
        variables && variables.trim() !== ''
          ? JSON.stringify({ query, variables: safeJson(variables) }, null, 2)
          : JSON.stringify({ query }, null, 2)
      return { type: 'graphql', raw: payload }
    }
    default:
      return { type: 'none' }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

function importItem(raw: unknown): CollectionItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as {
    name?: string
    item?: unknown[]
    request?: unknown
  }

  const name = item.name ?? 'Untitled'

  // A node with `item` is a folder.
  if (Array.isArray(item.item)) {
    const folder: Folder = {
      id: createId('fld_'),
      type: 'folder',
      name,
      items: item.item.map(importItem).filter((x): x is CollectionItem => x !== null)
    }
    return folder
  }

  if (item.request) {
    const req = item.request as {
      method?: string
      header?: { key?: string; value?: string; disabled?: boolean }[]
      url?: unknown
      body?: unknown
      auth?: unknown
    }

    const { url, params } = parseUrl(req.url)

    const headers: KeyValue[] = []
    for (const h of req.header ?? []) {
      if (typeof h?.key !== 'string') continue
      headers.push(kv(h.key, h.value ?? '', !h.disabled))
    }

    const config: RequestConfig = {
      method: (req.method?.toUpperCase() ?? 'GET') as HttpMethod,
      url,
      params,
      headers,
      body: parseBody(req.body),
      auth: parseAuth(req.auth)
    }

    const saved: SavedRequest = {
      id: createId('req_'),
      type: 'request',
      name,
      config
    }
    return saved
  }

  // A bare string item is a label; keep it as an empty request placeholder.
  return null
}

export interface ImportResult {
  collections: Collection[]
  errors: string[]
}

/** Parse a Postman Collection v2.x JSON document into our model. */
export function importPostmanCollection(json: string): ImportResult {
  const errors: string[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { collections: [], errors: ['That file is not valid JSON.'] }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { collections: [], errors: ['That file does not contain a collection.'] }
  }

  const doc = parsed as {
    info?: { name?: string; description?: string }
    item?: unknown[]
    collection?: unknown
  }

  // Tolerate a Postman "environment export" wrapper too.
  if (doc.collection) {
    return importPostmanCollection(JSON.stringify(doc.collection))
  }

  if (!Array.isArray(doc.item)) {
    errors.push('No "item" array found — is this a Postman Collection v2.1 file?')
    return { collections: [], errors }
  }

  const collection: Collection = {
    id: createId('col_'),
    name: doc.info?.name ?? 'Imported Collection',
    description: doc.info?.description,
    items: doc.item.map(importItem).filter((x): x is CollectionItem => x !== null)
  }

  return { collections: [collection], errors }
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function exportKeyValue(rows: KeyValue[]): { key: string; value: string; disabled?: boolean }[] {
  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    ...(row.enabled ? {} : { disabled: true })
  }))
}

function exportAuth(auth: AuthConfig): unknown {
  switch (auth.type) {
    case 'bearer':
      return { type: 'bearer', bearer: [{ key: 'token', value: auth.bearerToken ?? '', type: 'string' }] }
    case 'basic':
      return {
        type: 'basic',
        basic: [
          { key: 'username', value: auth.basicUsername ?? '', type: 'string' },
          { key: 'password', value: auth.basicPassword ?? '', type: 'string' }
        ]
      }
    case 'apikey':
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.apiKeyName ?? '', type: 'string' },
          { key: 'value', value: auth.apiKeyValue ?? '', type: 'string' },
          { key: 'in', value: auth.apiKeyIn ?? 'header', type: 'string' }
        ]
      }
    default:
      return undefined
  }
}

function exportBody(body: BodyConfig): unknown {
  switch (body.type) {
    case 'json':
      return { mode: 'raw', raw: body.raw ?? '', options: { raw: { language: 'json' } } }
    case 'raw':
      return {
        mode: 'raw',
        raw: body.raw ?? '',
        options: { raw: { language: body.rawLanguage ?? 'text' } }
      }
    case 'form':
      return { mode: 'urlencoded', urlencoded: exportKeyValue(body.formData ?? []) }
    case 'graphql': {
      const parsed = safeJson(body.raw ?? '{}') as { query?: string; variables?: unknown }
      return {
        mode: 'graphql',
        graphql: {
          query: parsed?.query ?? body.raw ?? '',
          variables:
            parsed?.variables !== undefined ? JSON.stringify(parsed.variables, null, 2) : ''
        }
      }
    }
    default:
      return undefined
  }
}

function exportItem(item: CollectionItem): unknown {
  if (item.type === 'folder') {
    return {
      name: item.name,
      item: item.items.map(exportItem)
    }
  }

  const { config } = item
  const enabledParams = config.params.filter(isEnabled)
  const queryString = enabledParams.length
    ? `?${enabledParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&')}`
    : ''

  return {
    name: item.name,
    request: {
      method: config.method,
      header: exportKeyValue(config.headers),
      url: {
        raw: `${config.url}${queryString}`,
        query: exportKeyValue(config.params)
      },
      ...(config.body.type !== 'none' ? { body: exportBody(config.body) } : {}),
      ...(config.auth.type !== 'none' ? { auth: exportAuth(config.auth) } : {})
    }
  }
}

/** Serialise collections into a Postman Collection v2.1 document. */
export function exportPostmanCollection(collection: Collection): string {
  const doc = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      ...(collection.description ? { description: collection.description } : {}),
      schema: POSTMAN_SCHEMA
    },
    item: collection.items.map(exportItem)
  }
  return JSON.stringify(doc, null, 2)
}

/** Serialise the whole set of collections as one combined document. */
export function exportAllCollections(collections: Collection[]): string {
  const doc = {
    info: {
      _postman_id: createId('col_'),
      name: 'Shitpostman Export',
      schema: POSTMAN_SCHEMA
    },
    item: collections.map((collection) => ({
      name: collection.name,
      item: collection.items.map(exportItem)
    }))
  }
  return JSON.stringify(doc, null, 2)
}

/** Environment export shaped like Postman's, for portability. */
export function exportEnvironment(name: string, values: KeyValue[]): string {
  return JSON.stringify(
    {
      name,
      values: values.map((v) => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
        type: 'default'
      })),
      _postman_variable_scope: 'environment'
    },
    null,
    2
  )
}

/** Parse a Postman environment export. */
export function importEnvironment(json: string): { name: string; values: KeyValue[] } | null {
  try {
    const parsed = JSON.parse(json) as {
      name?: string
      values?: { key?: string; value?: string; enabled?: boolean }[]
    }
    if (!Array.isArray(parsed.values)) return null
    return {
      name: parsed.name ?? 'Imported Environment',
      values: parsed.values
        .filter((v) => typeof v?.key === 'string')
        .map((v) => kv(v.key as string, v.value ?? '', v.enabled !== false))
    }
  } catch {
    return null
  }
}

export type { BodyType }
