/**
 * Types shared between the Electron main process and the React renderer.
 * Keep this file free of any runtime imports so it can be used on both sides.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS'
]

/** A single editable key/value row. */
export interface KeyValue {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey'

export interface AuthConfig {
  type: AuthType
  /** bearer */
  bearerToken?: string
  /** basic */
  basicUsername?: string
  basicPassword?: string
  /** apikey */
  apiKeyName?: string
  apiKeyValue?: string
  apiKeyIn?: 'header' | 'query'
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

export type BodyType = 'none' | 'json' | 'form' | 'raw' | 'graphql'
export type RawLanguage = 'json' | 'text' | 'xml' | 'html' | 'javascript'

export interface BodyConfig {
  type: BodyType
  /** raw / json / graphql payload */
  raw?: string
  rawLanguage?: RawLanguage
  formData?: KeyValue[]
}

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export interface RequestConfig {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  body: BodyConfig
  auth: AuthConfig
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export interface SavedRequest {
  id: string
  type: 'request'
  name: string
  config: RequestConfig
}

export interface Folder {
  id: string
  type: 'folder'
  name: string
  collapsed?: boolean
  items: CollectionItem[]
}

export type CollectionItem = Folder | SavedRequest

export interface Collection {
  id: string
  name: string
  description?: string
  collapsed?: boolean
  items: CollectionItem[]
}

/* ------------------------------------------------------------------ */
/* Environments                                                        */
/* ------------------------------------------------------------------ */

export interface Environment {
  id: string
  name: string
  variables: KeyValue[]
}

/* ------------------------------------------------------------------ */
/* Response                                                            */
/* ------------------------------------------------------------------ */

export interface HttpResponseData {
  status: number
  statusText: string
  /** Header map, lower-cased keys, values flattened with ", ". */
  headers: Record<string, string>
  /** Body as {@link dataEncoding}. */
  data: string
  dataEncoding: 'utf8' | 'base64'
  contentType: string
  /** Round-trip duration in milliseconds. */
  time: number
  /** Body size in bytes. */
  size: number
  ok: boolean
  /** The final URL, after query params and redirects. */
  url: string
  /** Chain of URLs followed. */
  redirects: string[]
}

export interface HttpErrorData {
  error: string
  code?: string
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  id: string
  timestamp: number
  method: HttpMethod
  url: string
  status?: number
  time?: number
  config: RequestConfig
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  /** Request timeout in ms. 0 disables the timeout. */
  timeout: number
  followRedirects: boolean
  sslVerification: boolean
  /** Maximum number of history entries to retain. */
  maxHistory: number
  /** Play subtle Aero UI sounds. */
  sounds: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  timeout: 30000,
  followRedirects: true,
  sslVerification: true,
  maxHistory: 200,
  sounds: false
}

/* ------------------------------------------------------------------ */
/* Persisted shape                                                     */
/* ------------------------------------------------------------------ */

export interface PersistedState {
  collections: Collection[]
  environments: Environment[]
  activeEnvironmentId: string | null
  history: HistoryEntry[]
  settings: AppSettings
}

/* ------------------------------------------------------------------ */
/* File dialogs                                                        */
/* ------------------------------------------------------------------ */

export interface SaveFileOptions {
  defaultPath?: string
  content: string
  encoding?: 'utf8' | 'base64'
  filters?: { name: string; extensions: string[] }[]
}

export interface SaveFileResult {
  canceled: boolean
  filePath?: string
}

export interface OpenFileOptions {
  filters?: { name: string; extensions: string[] }[]
}

export interface OpenFileResult {
  canceled: boolean
  filePath?: string
  content?: string
}
