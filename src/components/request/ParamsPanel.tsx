import { useAppStore } from '../../store/useAppStore'
import { KeyValueEditor } from '../ui/KeyValueEditor'
import { CopyButton } from '../ui/CopyButton'

/** Query parameter table. */
export function ParamsPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)

  const active = draft.params.filter((row) => row.enabled && row.key.trim())
  const preview = active.length
    ? `${draft.url.split('?')[0]}?${active
        .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
        .join('&')}`
    : draft.url.split('?')[0]

  return (
    <div className="app-pane__body--pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <KeyValueEditor
        rows={draft.params}
        onChange={(rows) => patchDraft({ params: rows })}
        keyPlaceholder="Parameter"
        valuePlaceholder="Value"
        showDescription
        emptyHint="No query parameters yet."
      />

      <div className="app-stack">
        <span className="app-toolbar__label">Resolved URL</span>
        <div className="aero-well app-code app-code--wrap" style={{ minHeight: 0 }}>
          {preview || '—'}
          <CopyButton value={preview} label="Copy URL" size={12} />
        </div>
      </div>
    </div>
  )
}
