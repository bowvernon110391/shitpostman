import type { AuthConfig, KeyValue } from '../shared/types'
import { isEnabled } from './utils'

export interface AuthContribution {
  /** Headers the auth method wants to add. */
  headers: Record<string, string>
  /** Query params the auth method wants to add. */
  query: Record<string, string>
}

const EMPTY: AuthContribution = { headers: {}, query: {} }

/**
 * Turn an {@link AuthConfig} into concrete headers / query params.
 *
 * User-authored headers always win: they are merged *after* this contribution,
 * mirroring Postman's behaviour.
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
      const encoded = Buffer.from(`${username}:${password}`, 'utf8').toString('base64')
      return {
        headers: { Authorization: `Basic ${encoded}` },
        query: {}
      }
    }

    case 'apikey': {
      const name = (config.apiKeyName ?? '').trim()
      const value = config.apiKeyValue ?? ''
      if (!name) return EMPTY
      if (config.apiKeyIn === 'query') {
        return { headers: {}, query: { [name]: value } }
      }
      return { headers: { [name]: value }, query: {} }
    }

    default:
      return EMPTY
  }
}

/** Build a Record from the enabled rows of a KeyValue list. */
export function kvListToRecord(rows: KeyValue[] | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows ?? []) {
    if (!isEnabled(row)) continue
    out[row.key] = row.value
  }
  return out
}
