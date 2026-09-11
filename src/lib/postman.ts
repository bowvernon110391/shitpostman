import type {
  AuthConfig,
  BodyConfig,
  Collection,
  CollectionItem,
  Environment,
  HttpMethod,
  KeyValue,
  RawLanguage
} from '@shared/types'
import { HTTP_METHODS, isEnabled, isFilled } from '@shared/types'
import { createId } from './ids'

const POSTMAN_SCHEMA =
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

function kv(key: string, value: string, enabled = true): KeyValue {
  return { id: createId('kv_'), key, value, enabled }
}

function enabledRows(rows: KeyValue[] | undefined): KeyValue[] {
  return (rows ?? []).filter(isEnabled)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

/** Turn a Postman v2.x `url` field into a URL string + query params. */
function parseUrl(raw: unknown): { url: string; params: KeyValue[] } {
  if (typeof raw === 'string') {
    const [base, query] = raw.split('?')
    return { url: base, params: query ? parseQueryString(query) : [] }
  }

  const record = asRecord(raw)
  if (!record) return { url: '', params: [] }

  const rawUrl = asString(record.raw)
  if (rawUrl) {
    const [base, query] = rawUrl.split('?')
    const fromQuery = query ? parseQueryString(query) : []
    const fromRows = parseKvArray(record.query)

    // Prefer the structured rows when they exist; they carry `disabled` flags.
    const merged = fromRows.length ? fromRows : fromQuery
    return { url: base, params: merged }
  }

  const protocol = asString(record.protocol, 'https')
  const host = Array.isArray(record.host) ? (record.host as string[]).join('.') : asString(record.host)
  const path = Array.isArray(record.path) ? (record.path as string[]).join('/') : asString(record.path)
  const port = record.port ? `:${String(record.port)}` : ''

  return {
    url: host ? `${protocol}://${host}${port}/${path}`.replace(/\/+$/, '') : '',
    params: parseKvArray(record.query)
  }
}

function parseQueryString(query: string): KeyValue[] {
  const params = new URLSearchParams(query)
  return [...params.entries()].map(([key, value]) => kv(key, value))
}

function parseKvArray(raw: unknown): KeyValue[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const record = asRecord(entry)
      if (!record) return null
      return kv(
        asString(record.key),
        asString(record.value),
        record.disabled !== true
      )
    })
    .filter((entry): entry is KeyValue => entry !== null)
}

function parseAuth(raw: unknown): AuthConfig {
  const record = asRecord(raw)
  if (!record) return { type: 'none', apiKeyIn: 'header' }

  const type = asString(record.type)
  const config = (Array.isArray(record[type]) ? record[type] : (record[type] as unknown)) ?? []
  const lookup: Record<string, string> = {}
  if (Array.isArray(config)) {
    for (const entry of config) {
      const pair = asRecord(entry)
      if (!pair) continue
      lookup[asString(pair.key)] = asString(pair.value)
    }
  }

  switch (type) {
    case 'bearer':
      return { type: 'bearer', bearerToken: lookup.token ?? '', apiKeyIn: 'header' }
    case 'basic':
      return {
        type: 'basic',
        basicUsername: lookup.username ?? '',
        basicPassword: lookup.password ?? '',
        apiKeyIn: 'header'
      }
    case 'apikey':
      return {
        type: 'apikey',
        apiKeyName: lookup.key ?? '',
        apiKeyValue: lookup.value ?? '',
        apiKeyIn: lookup.in === 'query' ? 'query' : 'header'
      }
    default:
      return { type: 'none', apiKeyIn: 'header' }
  }
}

function parseBody(raw: unknown): { body: BodyConfig; language?: 'json' } {
  const record = asRecord(raw)
  if (!record) {
    return { body: { type: 'none', raw: '', rawLanguage: 'json', formData: [] } }
  }

  const mode = asString(record.mode)

  switch (mode) {
    case 'raw': {
      const language = languageFromRaw(record)
      return {
        body: {
          type: language === 'json' ? 'json' : 'raw',
          raw: asString(record.raw),
          rawLanguage: language,
          formData: []
        }
      }
    }
    case 'urlencoded':
      return {
        body: {
          type: 'form',
          raw: '',
          rawLanguage: 'json',
          formData: parseKvArray(record.urlencoded)
        }
      }
    case 'graphql': {
      const graphql = asRecord(record.graphql)
      return {
        body: {
          type: 'graphql',
          raw: asString(graphql?.query),
          rawLanguage: 'json',
          formData: []
        }
      }
    }
    default:
      return { body: { type: 'none', raw: '', rawLanguage: 'json', formData: [] } }
  }
}

function languageFromRaw(record: Record<string, unknown>): RawLanguage {
  const options = asRecord(record.options)
  const raw = asRecord(options?.raw)
  const language = asString(raw?.language).toLowerCase()

  if (language.includes('json')) return 'json'
  if (language.includes('xml')) return 'xml'
  if (language.includes('html')) return 'html'
  if (language.includes('javascript')) return 'javascript'
  return 'text'
}

function parseItem(raw: unknown): CollectionItem | null {
  const record = asRecord(raw)
  if (!record) return null

  // A folder is signalled by a nested `item` array.
  if (Array.isArray(record.item)) {
    return {
      id: createId('fld_'),
      type: 'folder',
      name: asString(record.name, 'Folder'),
      collapsed: false,
      items: record.item
        .map(parseItem)
        .filter((item): item is CollectionItem => item !== null)
    }
  }

  const request = asRecord(record.request)
  if (!request) return null

  const method = asString(request.method, 'GET').toUpperCase() as HttpMethod
  const { url, params } = parseUrl(request.url)
  const { body } = parseBody(request.body)

  return {
    id: createId('req_'),
    type: 'request',
    name: asString(record.name, 'Request'),
    config: {
      method: HTTP_METHODS.includes(method) ? method : 'GET',
      url,
      params,
      headers: parseKvArray(request.header),
      body,
      auth: parseAuth(request.auth)
    }
  }
}

export interface ImportResult {
  collections: Collection[]
  errors: string[]
}

/** Parse a Postman collection export into app collections. */
export function importPostmanCollection(json: string): ImportResult {
  const errors: string[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { collections: [], errors: ['That file is not valid JSON.'] }
  }

  const documents: unknown[] = []
  const root = asRecord(parsed)

  if (root && root.collection) documents.push(root.collection)
  else if (root && Array.isArray(root.item)) documents.push(root)
  // A Postman "data dump" wraps everything in a `collections` array.
  else if (root && Array.isArray(root.collections)) documents.push(...root.collections)
  else {
    return {
      collections: [],
      errors: ['Unrecognised file. Expected a Postman v2.1 collection export.']
    }
  }

  const collections: Collection[] = []

  for (const document of documents) {
    const doc = asRecord(document)
    if (!doc) {
      errors.push('Skipped an entry that was not an object.')
      continue
    }
    if (!Array.isArray(doc.item)) {
      errors.push(`Skipped “${asString(doc.info ? asRecord(doc.info)?.name : '', 'unnamed')}” — no items.`)
      continue
    }

    const info = asRecord(doc.info)
    collections.push({
      id: createId('col_'),
      name: asString(info?.name, 'Imported collection'),
      description: asString(info?.description) || undefined,
      items: doc.item
        .map(parseItem)
        .filter((item): item is CollectionItem => item !== null)
    })
  }

  if (!collections.length && !errors.length) {
    errors.push('No collections found in that file.')
  }

  return { collections, errors }
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function exportRows(rows: KeyValue[] | undefined): unknown[] {
  return (rows ?? [])
    .filter(isFilled)
    .map((row) => ({ key: row.key, value: row.value, disabled: !row.enabled }))
}

function exportAuth(auth: AuthConfig): unknown | undefined {
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

function exportBody(body: BodyConfig): unknown | undefined {
  switch (body.type) {
    case 'none':
      return undefined
    case 'json':
      return { mode: 'raw', raw: body.raw ?? '', options: { raw: { language: 'json' } } }
    case 'raw':
      return {
        mode: 'raw',
        raw: body.raw ?? '',
        options: { raw: { language: body.rawLanguage ?? 'text' } }
      }
    case 'graphql':
      return { mode: 'graphql', graphql: { query: body.raw ?? '' } }
    case 'form':
      return { mode: 'urlencoded', urlencoded: exportRows(body.formData) }
    default:
      return undefined
  }
}

/** Rebuild a full URL string including enabled query params. */
function buildRawUrl(config: { url: string; params: KeyValue[] }): string {
  const params = enabledRows(config.params)
  if (!params.length) return config.url
  const separator = config.url.includes('?') ? '&' : '?'
  const query = params
    .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
    .join('&')
  return `${config.url}${separator}${query}`
}

function exportItem(item: CollectionItem): unknown {
  if (item.type === 'folder') {
    return {
      name: item.name,
      item: item.items.map(exportItem)
    }
  }

  const { config } = item

  return {
    name: item.name,
    request: {
      method: config.method,
      header: exportRows(config.headers),
      url: buildRawUrl({ url: config.url, params: config.params }),
      body: exportBody(config.body),
      auth: exportAuth(config.auth)
    },
    response: []
  }
}

/** Serialise every collection into one Postman-compatible document. */
export function exportAllCollections(collections: Collection[]): string {
  return JSON.stringify(
    {
      info: { name: 'Shitpostman export', schema: POSTMAN_SCHEMA },
      item: collections.flatMap((collection) =>
        (exportItem({ id: collection.id, type: 'folder', name: collection.name, items: collection.items }) as {
          item: unknown[]
        }).item
      )
    },
    null,
    2
  )
}

/**
 * Serialise an environment as a Postman environment document.
 * Disabled variables are dropped — Postman environments carry no per-row flag.
 */
export function exportEnvironment(name: string, variables: KeyValue[]): string {
  return JSON.stringify(
    {
      name,
      values: enabledRows(variables).map((row) => ({
        key: row.key,
        value: row.value,
        enabled: true
      })),
      _postman_variable_scope: 'environment'
    },
    null,
    2
  )
}

/** Parse a Postman environment document. */
export function importEnvironment(json: string): Environment | null {
  try {
    const parsed = asRecord(JSON.parse(json))
    if (!parsed) return null

    const name = asString(parsed.name, 'Imported environment')
    const values = Array.isArray(parsed.values) ? parsed.values : []

    return {
      id: createId('env_'),
      name,
      variables: values
        .map((entry) => {
          const record = asRecord(entry)
          if (!record) return null
          return kv(asString(record.key), asString(record.value), record.enabled !== false)
        })
        .filter((entry): entry is KeyValue => entry !== null)
    }
  } catch {
    return null
  }
}
