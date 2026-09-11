import type { HttpMethod } from '@shared/types'
import { methodClass } from '../../lib/format'

export function MethodPill({ method, className = '' }: { method: HttpMethod; className?: string }): JSX.Element {
  return (
    <span className={`aero-method aero-method--${methodClass(method)} ${className}`.trim()}>
      {method}
    </span>
  )
}
