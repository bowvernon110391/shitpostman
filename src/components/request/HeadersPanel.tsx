import { useAppStore } from '../../store/useAppStore'
import { KeyValueEditor } from '../ui/KeyValueEditor'

/** Request header table. */
export function HeadersPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)

  const count = draft.headers.filter((row) => row.enabled && row.key.trim()).length

  return (
    <div
      className="app-pane__body--pad"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <KeyValueEditor
        rows={draft.headers}
        onChange={(rows) => patchDraft({ headers: rows })}
        keyPlaceholder="Header"
        valuePlaceholder="Value"
        showDescription
        emptyHint="No headers yet — Content-Type is added automatically."
      />
      <span className="aero-hint">
        {count} header{count === 1 ? '' : 's'} will be sent. Auth headers are generated from the Auth
        tab and are not shown here.
      </span>
    </div>
  )
}
