import type { AuthConfig, KeyValue } from '@shared/types'

export interface AuthContribution {
  headers: Record<string, string>
  query: Record<string, string>
}

const EMPTY: AuthContribution = { headers: {}, query: {} }

/**
 * Renderer-side mirror of the main process auth builder.
 * Used purely for code generation and previews — the authoritative version
 * that actually performs the request lives in `electron/auth.ts`.
 */
export function buildAuth(config: AuthConfig | undefined): AuthContribution {
  if (!config || config.type === 'none') return EMPTY

  switch (config.type) {
    case 'bearer': {
      const token = (config.bearerToken ?? '').trim()
      if (!token) return EMPTY
      return { headers: { Authorization: `Bearer ${token}` }, query: {} }
    }
    case 'basic': {
      const username = config.basicUsername ?? ''
      const password = config.basicPassword ?? ''
      if (!username && !password) return EMPTY
      // btoa is fine here: base64 of UTF-8 needs care, but codegen output is
      // for display only.
      const encoded = btoa(unescape(encodeURIComponent(`${username}:${password}`)))
      return { headers: { Authorization: `Basic ${encoded}` }, query: {} }
    }
    case 'apikey': {
      const name = (config.apiKeyName ?? '').trim()
      if (!name) return EMPTY
      const value = config.apiKeyValue ?? ''
      if (config.apiKeyIn === 'query') return { headers: {}, query: { [name]: value } }
      return { headers: { [name]: value }, query: {} }
    }
    default:
      return EMPTY
  }
}

export function kvListToRecord(rows: KeyValue[] | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows ?? []) {
    if (!row.enabled || !row.key.trim()) continue
    out[row.key] = row.value
  }
  return out
}
