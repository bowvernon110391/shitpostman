import axios, { type AxiosRequestConfig } from 'axios'
import https from 'node:https'
import type {
  AppSettings,
  BodyConfig,
  HttpErrorData,
  HttpResponseData,
  RequestConfig
} from '../shared/types'
import { isEnabled } from '../shared/types'
import { buildAuth } from '../shared/auth'

/** Content types we can safely hand to the renderer as UTF-8 text. */
const TEXTUAL_RE =
  /^(?:text\/|application\/(?:json|[\w.+-]*\+json|xml|[\w.+-]*\+xml|javascript|ecmascript|x-www-form-urlencoded|graphql|x-ndjson|ndjson|sql|yaml|x-yaml))/

function isTextualContentType(contentType: string): boolean {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase()
  if (!ct) return true
  return TEXTUAL_RE.test(ct)
}

/** Case-insensitive lookup helper for header maps. */
function findKeyInsensitive(map: Record<string, string>, key: string): string | undefined {
  const target = key.toLowerCase()
  return Object.keys(map).find((k) => k.toLowerCase() === target)
}

/** Default Content-Type for each body mode. */
function defaultContentType(body: BodyConfig): string | undefined {
  switch (body.type) {
    case 'json':
      return 'application/json'
    case 'graphql':
      return 'application/json'
    case 'form':
      return 'application/x-www-form-urlencoded'
    case 'raw':
      switch (body.rawLanguage) {
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
    default:
      return undefined
  }
}

/** Serialise the request body into something axios can send. */
function buildBody(body: BodyConfig): { data?: unknown; contentType?: string } {
  if (body.type === 'none') return {}

  switch (body.type) {
    case 'json': {
      const raw = (body.raw ?? '').trim()
      if (!raw) return { contentType: 'application/json' }
      return { data: raw, contentType: 'application/json' }
    }
    case 'graphql': {
      const raw = (body.raw ?? '').trim()
      if (!raw) return { contentType: 'application/json' }
      // Accept either a raw query or a full {query, variables} document.
      let payload: string
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        payload = JSON.stringify(parsed)
      } catch {
        payload = JSON.stringify({ query: raw })
      }
      return { data: payload, contentType: 'application/json' }
    }
    case 'form': {
      const params = new URLSearchParams()
      for (const row of body.formData ?? []) {
        if (!isEnabled(row)) continue
        params.append(row.key, row.value)
      }
      const encoded = params.toString()
      return { data: encoded, contentType: 'application/x-www-form-urlencoded' }
    }
    case 'raw': {
      const raw = body.raw ?? ''
      if (!raw) return {}
      return { data: raw, contentType: defaultContentType(body) }
    }
    default:
      return {}
  }
}

/** Assemble the axios config from a resolved request + settings. */
function buildAxiosConfig(
  config: RequestConfig,
  settings: AppSettings
): AxiosRequestConfig {
  const auth = buildAuth(config.auth)

  const query: Record<string, string> = { ...auth.query }
  for (const row of config.params) {
    if (!isEnabled(row)) continue
    query[row.key] = row.value
  }

  const headers: Record<string, string> = { ...auth.headers }
  for (const row of config.headers) {
    if (!isEnabled(row)) continue
    headers[row.key] = row.value
  }

  const { data, contentType } = buildBody(config.body)

  // Only inject a default Content-Type when the user hasn't supplied one.
  if (contentType && !findKeyInsensitive(headers, 'content-type')) {
    headers['Content-Type'] = contentType
  }

  const axiosConfig: AxiosRequestConfig = {
    url: config.url,
    method: config.method,
    headers,
    params: Object.keys(query).length ? query : undefined,
    data,
    timeout: settings.timeout > 0 ? settings.timeout : 0,
    maxRedirects: settings.followRedirects ? 6 : 0,
    validateStatus: () => true,
    responseType: 'arraybuffer',
    decompress: true,
    transitional: { clarifyTimeoutError: true }
  }

  if (!settings.sslVerification) {
    axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false })
  }

  return axiosConfig
}

/** Flatten axios headers (values may be arrays) into a plain string map. */
function normaliseHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined || value === null) continue
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  return out
}

/** Map a thrown axios/network error into something readable. */
function toHttpError(error: unknown): HttpErrorData {
  const err = error as {
    code?: string
    message?: string
    cause?: { code?: string; message?: string }
  }
  const code = err.code ?? err.cause?.code
  const detail = err.cause?.message ?? err.message ?? 'Request failed'

  const friendly: Record<string, string> = {
    ECONNREFUSED: 'Connection refused — is the server running?',
    ECONNRESET: 'Connection reset by the server.',
    ENOTFOUND: 'Host not found — check the URL for typos.',
    EAI_AGAIN: 'DNS lookup failed — check your network connection.',
    ETIMEDOUT: 'Connection timed out.',
    ECONNABORTED: 'Request timed out.',
    ERR_FR_TOO_MANY_REDIRECTS: 'Too many redirects.',
    ERR_INVALID_URL: 'That URL is not valid.',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'TLS certificate is self-signed.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TLS certificate could not be verified.',
    CERT_HAS_EXPIRED: 'TLS certificate has expired.'
  }

  return {
    error: (code && friendly[code]) || detail,
    code: code ?? undefined
  }
}

/**
 * Execute a request from the main process.
 *
 * Running here (rather than in the renderer) bypasses CORS entirely, which is
 * the whole reason this app is a desktop client rather than a web page.
 */
export async function sendRequest(
  config: RequestConfig,
  settings: AppSettings
): Promise<HttpResponseData | HttpErrorData> {
  if (!config.url || !config.url.trim()) {
    return { error: 'Enter a URL to send a request.' }
  }

  if (!/^https?:\/\//i.test(config.url.trim())) {
    return {
      error:
        'URL must start with http:// or https:// — variables like {{base_url}} must resolve first.'
    }
  }

  const redirects: string[] = []
  const axiosConfig = buildAxiosConfig(config, settings)

  if (settings.followRedirects) {
    axiosConfig.beforeRedirect = (options: Record<string, unknown>) => {
      const href = options?.href as string | undefined
      if (href) redirects.push(href)
    }
  }

  const startedAt = Date.now()

  try {
    const response = await axios.request(axiosConfig)
    const time = Date.now() - startedAt

    const rawBody = response.data
    const buffer: Buffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : typeof rawBody === 'string'
        ? Buffer.from(rawBody, 'utf8')
        : Buffer.from(rawBody ?? [])

    const headers = normaliseHeaders(response.headers)
    const contentType = headers['content-type'] ?? ''

    const textual = isTextualContentType(contentType)

    return {
      status: response.status,
      statusText: response.statusText ?? '',
      headers,
      data: buffer.toString(textual ? 'utf8' : 'base64'),
      dataEncoding: textual ? 'utf8' : 'base64',
      contentType,
      time,
      size: buffer.byteLength,
      ok: response.status >= 200 && response.status < 400,
      url: config.url,
      redirects
    }
  } catch (error) {
    return toHttpError(error)
  }
}
