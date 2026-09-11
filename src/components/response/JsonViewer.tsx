import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Copy, Check } from 'lucide-react'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function previewOf(value: unknown): string {
  if (Array.isArray(value)) return `Array(${value.length})`
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    return keys.length ? `{ ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', …' : ''} }` : '{}'
  }
  return String(value)
}

interface LeafProps {
  value: unknown
  suffix?: string
}

function Leaf({ value, suffix }: LeafProps): JSX.Element {
  let className = 'app-json__null'
  let text = 'null'

  if (typeof value === 'string') {
    className = 'app-json__string'
    text = `"${value}"`
  } else if (typeof value === 'number') {
    className = 'app-json__number'
    text = String(value)
  } else if (typeof value === 'boolean') {
    className = 'app-json__boolean'
    text = String(value)
  } else if (value === undefined) {
    className = 'app-json__null'
    text = 'undefined'
  }

  return (
    <>
      <span className={className}>{text}</span>
      {suffix ? <span className="app-json__punct">{suffix}</span> : null}
    </>
  )
}

interface RowProps {
  label?: string
  value: unknown
  depth: number
  trailing?: string
  last?: boolean
  /** Bulk state to apply, re-applied every time `revision` changes. */
  mode: boolean
  revision: number
}

function JsonRow({
  label,
  value,
  depth,
  trailing,
  last = false,
  mode,
  revision
}: RowProps): JSX.Element {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  // Pretty view opens everything by default. The toolbar's Expand all /
  // Collapse all buttons bump `revision` so every node snaps to `mode`, while
  // each node can still be toggled on its own afterwards.
  useEffect(() => {
    setOpen(mode)
  }, [mode, revision])

  const isContainer = Array.isArray(value) || isPlainObject(value)
  const entries: [string, unknown][] = useMemo(() => {
    if (Array.isArray(value)) return value.map((entry, index) => [String(index), entry])
    if (isPlainObject(value)) return Object.entries(value)
    return []
  }, [value])

  const copy = (): void => {
    void navigator.clipboard
      ?.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      })
  }

  return (
    <>
      <div className="app-json__row">
        {Array.from({ length: depth }).map((_, index) => (
          <span key={index} className="app-json__indent" />
        ))}

        {isContainer ? (
          <button
            type="button"
            className={`app-json__toggle${open ? ' app-json__toggle--open' : ''}`}
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <ChevronRight size={10} />
          </button>
        ) : (
          <span className="app-json__spacer" />
        )}

        {label !== undefined ? (
          <>
            <span className="app-json__key">{label}</span>
            <span className="app-json__colon">:</span>
          </>
        ) : null}

        {isContainer ? (
          <>
            <span className="app-json__punct">{Array.isArray(value) ? '[' : '{'}</span>
            {!open ? (
              <>
                <span className="app-json__meta"> {previewOf(value)} </span>
                <span className="app-json__punct">{Array.isArray(value) ? ']' : '}'}</span>
                {!last && trailing ? <span className="app-json__punct">{trailing}</span> : null}
              </>
            ) : null}
          </>
        ) : (
          <Leaf value={value} suffix={last ? undefined : trailing} />
        )}

        <button
          type="button"
          className="app-json__copy"
          onClick={copy}
          title="Copy value"
          aria-label="Copy value"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>

      {isContainer && open ? (
        <>
          {entries.map(([key, entry], index) => (
            <JsonRow
              key={key}
              label={Array.isArray(value) ? undefined : key}
              value={entry}
              depth={depth + 1}
              trailing={index === entries.length - 1 ? '' : ','}
              last={index === entries.length - 1}
              mode={mode}
              revision={revision}
            />
          ))}
          <div className="app-json__row">
            {Array.from({ length: depth }).map((_, index) => (
              <span key={index} className="app-json__indent" />
            ))}
            <span className="app-json__spacer" />
            <span className="app-json__punct">{Array.isArray(value) ? ']' : '}'}</span>
            {!last && trailing ? <span className="app-json__punct">{trailing}</span> : null}
          </div>
        </>
      ) : null}
    </>
  )
}

/** Collapsible, colourised JSON tree. Expanded in full by default. */
export function JsonViewer({
  value,
  mode,
  revision
}: {
  value: unknown
  mode: boolean
  revision: number
}): JSX.Element {
  return (
    <div className="app-json aero-scroll">
      <JsonRow value={value} depth={0} last mode={mode} revision={revision} />
    </div>
  )
}
