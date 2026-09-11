import type { AuthConfig } from './types'

/** Headers and query params contributed by the selected auth method. */
export interface AuthContribution {
  /** Headers the auth method wants to add. */
  headers: Record<string, string>
  /** Query params the auth method wants to add. */
  query: Record<string, string>
}

const EMPTY: AuthContribution = { headers: {}, query: {} }

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * UTF-8 safe base64.
 *
 * Hand-rolled so this module runs unchanged in the Electron main process and
 * the renderer, without `Buffer` (Node only) or the legacy `btoa` global.
 */
function base64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let out = ''

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined

    out += B64_ALPHABET[b0 >> 2]
    out += B64_ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : B64_ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : B64_ALPHABET[b2 & 63]
  }

  return out
}

/**
 * Turn an {@link AuthConfig} into concrete headers / query params.
 *
 * User-authored headers always win: they are merged *after* this contribution,
 * mirroring Postman's behaviour.
 *
 * Shared by the main process (which actually performs the request) and the
 * renderer (which uses it for codegen and previews), so the two can never drift.
 */
export function buildAuth(config: AuthConfig | undefined): AuthContribution {
  if (!config || config.type === 'none') return EMPTY

  switch (config.type) {
    case 'bearer': {
      const token = (config.bearerToken ?? '').trim()
      if (!token) return EMPTY
      return {
        headers: { Authorization: `Bearer ${token}` },
        query: {}
      }
    }

    case 'basic': {
      const username = config.basicUsername ?? ''
      const password = config.basicPassword ?? ''
      if (!username && !password) return EMPTY
      const encoded = base64(`${username}:${password}`)
      return {
        headers: { Authorization: `Basic ${encoded}` },
        query: {}
      }
    }

    case 'apikey': {
      const name = (config.apiKeyName ?? '').trim()
      if (!name) return EMPTY
      const value = config.apiKeyValue ?? ''
      if (config.apiKeyIn === 'query') {
        return { headers: {}, query: { [name]: value } }
      }
      return { headers: { [name]: value }, query: {} }
    }

    default:
      return EMPTY
  }
}
