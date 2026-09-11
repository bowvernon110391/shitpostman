import type {
  AuthConfig,
  BodyConfig,
  Collection,
  CollectionItem,
  KeyValue,
  RequestConfig
} from '@shared/types'
import { createId } from './ids'

export function emptyAuth(): AuthConfig {
  return { type: 'none', apiKeyIn: 'header' }
}

export function emptyBody(): BodyConfig {
  return { type: 'none', raw: '', rawLanguage: 'json', formData: [] }
}

export function emptyRow(): KeyValue {
  return { id: createId('kv_'), key: '', value: '', enabled: true }
}

/** A blank request, used for the "new request" tab and as a template. */
export function emptyRequest(): RequestConfig {
  return {
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: emptyBody(),
    auth: emptyAuth()
  }
}

/** Deep clone that also regenerates ids, so duplicates are independent. */
export function cloneRequest(config: RequestConfig): RequestConfig {
  const cloneRows = (rows: KeyValue[]): KeyValue[] =>
    rows.map((row) => ({ ...row, id: createId('kv_') }))

  return {
    method: config.method,
    url: config.url,
    params: cloneRows(config.params),
    headers: cloneRows(config.headers),
    body: {
      ...config.body,
      formData: config.body.formData ? cloneRows(config.body.formData) : []
    },
    auth: { ...config.auth }
  }
}

/** Deep clone a collection node, regenerating every id in the subtree. */
export function cloneItem(item: CollectionItem): CollectionItem {
  if (item.type === 'folder') {
    return {
      id: createId('fld_'),
      type: 'folder',
      name: item.name,
      collapsed: item.collapsed,
      items: item.items.map(cloneItem)
    }
  }
  return {
    id: createId('req_'),
    type: 'request',
    name: item.name,
    config: cloneRequest(item.config)
  }
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

function row(key: string, value: string, enabled = true): KeyValue {
  return { id: createId('kv_'), key, value, enabled }
}

function get(path: string, name: string): CollectionItem {
  return {
    id: createId('req_'),
    type: 'request',
    name,
    config: {
      method: 'GET',
      url: `https://httpbin.org${path}`,
      params: [],
      headers: [],
      body: emptyBody(),
      auth: emptyAuth()
    }
  }
}

/** Starter content so the app is not an empty box on first launch. */
export function seedCollections(): Collection[] {
  const httpbin: Collection = {
    id: createId('col_'),
    name: 'HTTPBin Playground',
    description: 'Handy echo endpoints for trying things out.',
    items: [
      {
        id: createId('fld_'),
        type: 'folder',
        name: 'Requests',
        items: [
          get('/get', 'GET request'),
          {
            id: createId('req_'),
            type: 'request',
            name: 'POST JSON',
            config: {
              method: 'POST',
              url: 'https://httpbin.org/post',
              params: [],
              headers: [row('Accept', 'application/json')],
              body: {
                type: 'json',
                raw: '{\n  "name": "Shitpostman",\n  "vibe": "frutiger aero"\n}',
                rawLanguage: 'json',
                formData: []
              },
              auth: emptyAuth()
            }
          }
        ]
      },
      {
        id: createId('fld_'),
        type: 'folder',
        name: 'Authentication',
        items: [
          {
            id: createId('req_'),
            type: 'request',
            name: 'Bearer token',
            config: {
              method: 'GET',
              url: 'https://httpbin.org/bearer',
              params: [],
              headers: [],
              body: emptyBody(),
              auth: { type: 'bearer', bearerToken: '{{api_token}}', apiKeyIn: 'header' }
            }
          },
          {
            id: createId('req_'),
            type: 'request',
            name: 'Basic auth',
            config: {
              method: 'GET',
              url: 'https://httpbin.org/basic-auth/meadow/fish',
              params: [],
              headers: [],
              body: emptyBody(),
              auth: {
                type: 'basic',
                basicUsername: 'meadow',
                basicPassword: 'fish',
                apiKeyIn: 'header'
              }
            }
          },
          {
            id: createId('req_'),
            type: 'request',
            name: 'API key (header)',
            config: {
              method: 'GET',
              url: 'https://httpbin.org/headers',
              params: [],
              headers: [],
              body: emptyBody(),
              auth: {
                type: 'apikey',
                apiKeyName: 'X-Api-Key',
                apiKeyValue: 'aero-12345',
                apiKeyIn: 'header'
              }
            }
          }
        ]
      },
      {
        id: createId('fld_'),
        type: 'folder',
        name: 'Response types',
        items: [get('/image/png', 'PNG image'), get('/html', 'HTML page'), get('/xml', 'XML')]
      }
    ]
  }

  return [httpbin]
}
