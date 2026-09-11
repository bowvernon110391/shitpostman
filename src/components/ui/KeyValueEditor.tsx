import { useEffect, useMemo, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { KeyValue } from '@shared/types'
import { createId } from '../../lib/ids'

interface KeyValueEditorProps {
  rows: KeyValue[]
  onChange: (rows: KeyValue[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  descriptionPlaceholder?: string
  showDescription?: boolean
  emptyHint?: string
}

function isBlank(row: KeyValue | undefined): boolean {
  return !row || (!row.key.trim() && !row.value.trim() && !(row.description ?? '').trim())
}

/**
 * Postman-style editable key/value table with a permanent trailing blank row.
 * Toggling, editing and deleting all flow through a single `onChange`.
 */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  showDescription = false,
  emptyHint
}: KeyValueEditorProps): JSX.Element {
  const [blankId, setBlankId] = useState(() => createId('kv_'))

  // Whenever the last row is filled in, mint a fresh blank row beneath it.
  const lastRow = rows[rows.length - 1]
  useEffect(() => {
    if (lastRow && !isBlank(lastRow)) setBlankId(createId('kv_'))
  }, [lastRow])

  const effective = useMemo<KeyValue[]>(() => {
    if (isBlank(lastRow)) return rows
    return [...rows, { id: blankId, key: '', value: '', enabled: true, description: '' }]
  }, [rows, lastRow, blankId])

  const update = (index: number, patch: Partial<KeyValue>): void => {
    onChange(effective.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const remove = (id: string): void => {
    onChange(rows.filter((row) => row.id !== id))
  }

  const gridClass = showDescription ? 'app-kv--4' : 'app-kv--3'
  const filledCount = rows.filter((row) => row.key.trim()).length

  return (
    <div className="aero-kv">
      <div className={`aero-kv__head ${gridClass}`}>
        <span />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        {showDescription ? <span>{descriptionPlaceholder}</span> : null}
        <span />
      </div>

      {filledCount === 0 && emptyHint ? <div className="app-kv__empty">{emptyHint}</div> : null}

      {effective.map((row, index) => (
        <div
          key={row.id}
          className={`aero-kv__row ${gridClass}${row.enabled ? '' : ' aero-kv__row--off'}`}
        >
          <div className="app-kv__checkcell">
            <button
              type="button"
              className={`aero-check${row.enabled ? ' aero-check--on' : ''}`}
              onClick={() => update(index, { enabled: !row.enabled })}
              aria-label={row.enabled ? 'Disable row' : 'Enable row'}
              title={row.enabled ? 'Disable' : 'Enable'}
            >
              {row.enabled ? <Check className="aero-check__tick" size={11} strokeWidth={3} /> : null}
            </button>
          </div>

          <input
            className="aero-kv__input"
            value={row.key}
            placeholder={keyPlaceholder}
            spellCheck={false}
            onChange={(event) => update(index, { key: event.target.value })}
          />

          <input
            className="aero-kv__input"
            value={row.value}
            placeholder={valuePlaceholder}
            spellCheck={false}
            onChange={(event) => update(index, { value: event.target.value })}
          />

          {showDescription ? (
            <input
              className="aero-kv__input"
              value={row.description ?? ''}
              placeholder={descriptionPlaceholder}
              spellCheck={false}
              onChange={(event) => update(index, { description: event.target.value })}
            />
          ) : null}

          <button
            type="button"
            className="aero-kv__delete"
            onClick={() => remove(row.id)}
            disabled={!rows.some((item) => item.id === row.id)}
            aria-label="Remove row"
            title="Remove row"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
