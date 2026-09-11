import type { HttpMethod } from '@shared/types'

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** Human-readable duration. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'violet'

/** Colour tone for an HTTP status code. */
export function statusTone(status: number | undefined): Tone {
  if (status === undefined) return 'neutral'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'info'
  if (status >= 400 && status < 500) return 'warning'
  if (status >= 500) return 'danger'
  return 'neutral'
}

/** CSS modifier suffix for a method pill. */
export function methodClass(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'get'
    case 'POST':
      return 'post'
    case 'PUT':
      return 'put'
    case 'PATCH':
      return 'patch'
    case 'DELETE':
      return 'delete'
    case 'HEAD':
      return 'head'
    case 'OPTIONS':
      return 'options'
    default:
      return 'neutral'
  }
}

/** Short label for a content type, for the response toolbar. */
export function contentTypeLabel(contentType: string): string {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase()
  if (!ct) return 'unknown'
  if (ct.includes('json')) return 'JSON'
  if (ct.includes('html')) return 'HTML'
  if (ct.includes('xml')) return 'XML'
  if (ct.startsWith('image/')) return 'Image'
  if (ct.startsWith('text/')) return ct.replace('text/', '').toUpperCase() + ' text'
  if (ct.includes('javascript')) return 'JavaScript'
  if (ct.includes('form-urlencoded')) return 'Form'
  if (ct.includes('pdf')) return 'PDF'
  return ct
}

/** True when the content type is safe to render as an image preview. */
export function isImageType(contentType: string): boolean {
  return /^image\//i.test((contentType || '').split(';')[0].trim())
}

/** True when the content type is HTML. */
export function isHtmlType(contentType: string): boolean {
  return /html/i.test((contentType || '').split(';')[0].trim())
}

/** Relative "time ago" for history rows. */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Pretty-print a body when it looks like JSON; otherwise return as-is. */
export function tryPrettyJson(text: string): { pretty: string; parsed: unknown } | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!/^[[{]/.test(trimmed)) return null
  try {
    const parsed = JSON.parse(trimmed)
    return { pretty: JSON.stringify(parsed, null, 2), parsed }
  } catch {
    return null
  }
}

/** Convert a base64 body into a Blob URL data string for previews. */
export function base64ToDataUrl(base64: string, contentType: string): string {
  return `data:${contentType || 'application/octet-stream'};base64,${base64}`
}
