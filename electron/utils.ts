import type { KeyValue } from '../shared/types'

/** A row counts as "active" when it is enabled and has a non-empty key. */
export function isEnabled(row: KeyValue): boolean {
  return row.enabled && row.key.trim().length > 0
}

/** Collision-resistant enough id for local UI entities. */
export function createId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}${time}${rand}`
}

/** Case-insensitive lookup helper for header maps. */
export function findKeyInsensitive(map: Record<string, string>, key: string): string | undefined {
  const target = key.toLowerCase()
  return Object.keys(map).find((k) => k.toLowerCase() === target)
}
