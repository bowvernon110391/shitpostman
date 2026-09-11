import { isEnabled, type KeyValue, type RequestConfig } from '@shared/types'

export type VariableMap = Record<string, string>

/** Values generated fresh on every resolution pass. */
function dynamicValue(name: string): string | undefined {
  switch (name) {
    case '$timestamp':
      return String(Math.floor(Date.now() / 1000))
    case '$isoTimestamp':
      return new Date().toISOString()
    case '$uuid':
      return crypto.randomUUID()
    case '$randomInt':
      return String(Math.floor(Math.random() * 1000))
    case '$randomFloat':
      return Math.random().toFixed(6)
    default:
      return undefined
  }
}

const MAX_DEPTH = 12

/**
 * Resolve `{{variable}}` references inside a string.
 * Supports environment variables plus a few `$dynamic` built-ins.
 */
export function resolveString(
  input: string,
  vars: VariableMap,
  depth = 0
): string {
  if (!input || depth > MAX_DEPTH) return input ?? ''

  return input.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, rawName: string) => {
    const name = rawName.trim()

    const dynamic = dynamicValue(name)
    if (dynamic !== undefined) return dynamic

    // Environment vars are case-insensitive, matching Postman.
    const found =
      vars[name] ??
      Object.entries(vars).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1]

    if (found === undefined) return match

    // A variable may itself reference another variable.
    return resolveString(found, vars, depth + 1)
  })
}

function resolveRows(rows: KeyValue[], vars: VariableMap): KeyValue[] {
  return rows.map((row) => ({
    ...row,
    key: resolveString(row.key, vars),
    value: resolveString(row.value, vars)
  }))
}

/** Apply variable substitution across an entire request config. */
export function resolveRequest(config: RequestConfig, vars: VariableMap): RequestConfig {
  return {
    method: config.method,
    url: resolveString(config.url.trim(), vars),
    params: resolveRows(config.params, vars),
    headers: resolveRows(config.headers, vars),
    body: {
      ...config.body,
      raw: config.body.raw !== undefined ? resolveString(config.body.raw, vars) : undefined,
      formData: config.body.formData ? resolveRows(config.body.formData, vars) : undefined
    },
    auth: {
      type: config.auth.type,
      bearerToken: resolveString(config.auth.bearerToken ?? '', vars),
      basicUsername: resolveString(config.auth.basicUsername ?? '', vars),
      basicPassword: resolveString(config.auth.basicPassword ?? '', vars),
      apiKeyName: resolveString(config.auth.apiKeyName ?? '', vars),
      apiKeyValue: resolveString(config.auth.apiKeyValue ?? '', vars),
      apiKeyIn: config.auth.apiKeyIn
    }
  }
}

/** Every variable name referenced anywhere in a request. */
function collectVariableNames(config: RequestConfig): string[] {
  const names = new Set<string>()

  const scan = (text: string | undefined): void => {
    if (!text) return
    for (const match of text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
      const name = match[1].trim()
      if (!name.startsWith('$')) names.add(name)
    }
  }

  scan(config.url)
  for (const row of [...config.params, ...config.headers]) {
    scan(row.key)
    scan(row.value)
  }
  for (const row of config.body.formData ?? []) {
    scan(row.key)
    scan(row.value)
  }
  scan(config.body.raw)

  const auth = config.auth
  scan(auth.bearerToken)
  scan(auth.basicUsername)
  scan(auth.apiKeyName)
  scan(auth.apiKeyValue)

  return [...names]
}

/** Variable names that the active environment does not define. */
export function findUnresolved(config: RequestConfig, vars: VariableMap): string[] {
  return collectVariableNames(config).filter((name) => {
    const defined =
      vars[name] !== undefined ||
      Object.keys(vars).some((k) => k.toLowerCase() === name.toLowerCase())
    return !defined
  })
}

/** Convert enabled KeyValue rows into a plain lookup map. */
export function rowsToMap(rows: KeyValue[]): VariableMap {
  const out: VariableMap = {}
  for (const row of rows) {
    if (!isEnabled(row)) continue
    out[row.key.trim()] = row.value
  }
  return out
}
