import { Clock, RotateCcw, Trash2 } from 'lucide-react'
import type { HistoryEntry } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { MethodPill } from '../ui/MethodPill'
import { timeAgo, formatDuration, statusTone } from '../../lib/format'

/** Sidebar panel listing previously sent requests. */
export function HistoryPanel(): JSX.Element {
  const history = useAppStore((state) => state.history)
  const restoreHistory = useAppStore((state) => state.restoreHistory)
  const deleteHistoryEntry = useAppStore((state) => state.deleteHistoryEntry)
  const clearHistory = useAppStore((state) => state.clearHistory)
  const askConfirm = useUiStore((state) => state.askConfirm)

  if (history.length === 0) {
    return (
      <div className="aero-tree aero-scroll">
        <div className="app-placeholder" style={{ height: 'auto', paddingTop: 40 }}>
          <Clock size={28} className="aero-dim" />
          <span className="app-placeholder__title">No history yet</span>
          <span className="app-placeholder__hint">Requests you send show up here.</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="app-list app-list--scroll aero-scroll">
        {history.map((entry: HistoryEntry) => {
          const tone = statusTone(entry.status)
          return (
            <div
              key={entry.id}
              className="app-list__row"
              onClick={() => restoreHistory(entry.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') restoreHistory(entry.id)
              }}
            >
              <div className="app-list__main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MethodPill method={entry.method} />
                  {entry.status !== undefined ? (
                    <span className={`aero-badge aero-badge--${tone === 'neutral' ? 'neutral' : tone}`}>
                      {entry.status}
                    </span>
                  ) : (
                    <span className="aero-badge aero-badge--danger">failed</span>
                  )}
                  <span className="aero-dim" style={{ fontSize: 11 }}>
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
                <span className="app-list__title aero-ellipsis" title={entry.url}>
                  {entry.url || '(no url)'}
                </span>
                {entry.time !== undefined ? (
                  <span className="app-list__meta">{formatDuration(entry.time)}</span>
                ) : null}
              </div>
              <div className="app-list__actions">
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Restore this request"
                  onClick={(event) => {
                    event.stopPropagation()
                    restoreHistory(entry.id)
                  }}
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Remove from history"
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteHistoryEntry(entry.id)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="app-sidebar__foot">
        <button
          type="button"
          className="aero-button aero-button--sm aero-button--danger"
          onClick={() =>
            askConfirm({
              title: 'Clear history',
              message: `All ${history.length} history entries will be removed.`,
              confirmLabel: 'Clear',
              danger: true,
              onConfirm: () => clearHistory()
            })
          }
        >
          <Trash2 size={12} />
          Clear history
        </button>
        <span className="app-sidebar__foot-spacer" />
        <span className="aero-dim" style={{ fontSize: 11 }}>
          {history.length} entries
        </span>
      </div>
    </>
  )
}
