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

/**
 * A row "counts" when it has a non-empty key, regardless of its enabled flag.
 *
 * Deliberately distinct from {@link isEnabled}: environment variables have no
 * enabled flag at all, and Postman export must retain disabled rows so it can
 * write `disabled: true`.
 */
export function isFilled(row: KeyValue): boolean {
  return row.key.trim().length > 0
}

/**
 * A row counts as "active" when it is enabled and has a non-empty key.
 *
 * Shared by both processes so that request assembly, previews and code
 * generation all agree on exactly which rows are actually sent.
 */
export function isEnabled(row: KeyValue): boolean {
  return row.enabled && isFilled(row)
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

/** How the editor and response panes share the work area. */
export type PaneLayout = 'stacked' | 'sideBySide'

export interface AppSettings {
  /** Request timeout in ms. 0 disables the timeout. */
  timeout: number
  followRedirects: boolean
  sslVerification: boolean
  /** Maximum number of history entries to retain. */
  maxHistory: number
  /** Play subtle Aero UI sounds. */
  sounds: boolean
  /** Left rail width in px. Retained even while the rail is collapsed. */
  sidebarWidth: number
  sidebarCollapsed: boolean
  paneLayout: PaneLayout
  /**
   * The editor's share of the work area, 0..1. Tracked per orientation so
   * flipping the layout does not stomp on the other axis' captured position.
   */
  editorRatioY: number
  editorRatioX: number
  /** Response fills the whole work area and the editor is hidden. */
  responseMaximized: boolean
  /**
   * Height of the request body's raw editor in px. It only applies to the modes
   * that show one (JSON / Raw / GraphQL). The ceiling is measured from the space
   * the tab actually has, so a stored value bigger than that is clamped on read
   * rather than written back.
   */
  bodyEditorHeight: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  timeout: 30000,
  followRedirects: true,
  sslVerification: true,
  maxHistory: 200,
  sounds: false,
  sidebarWidth: 300,
  sidebarCollapsed: false,
  paneLayout: 'stacked',
  // 0.46 reproduces the fixed 46% split this replaced.
  editorRatioY: 0.46,
  editorRatioX: 0.5,
  responseMaximized: false,
  // Just above the fixed 180px this replaced, so the floor is not the default.
  bodyEditorHeight: 200
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
