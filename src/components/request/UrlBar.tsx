import { Loader2, Save, Send, Sparkles } from 'lucide-react'
import { HTTP_METHODS, type HttpMethod } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { findUnresolved } from '../../lib/variables'

/** Method picker + URL field + save/send actions. */
export function UrlBar(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)
  const send = useAppStore((state) => state.send)
  const sending = useAppStore((state) => state.sending)
  const draftOriginId = useAppStore((state) => state.draftOriginId)
  const updateSavedRequest = useAppStore((state) => state.updateSavedRequest)
  const activeVariables = useAppStore((state) => state.activeVariables)
  const notify = useAppStore((state) => state.notify)
  const openModal = useUiStore((state) => state.openModal)

  const unresolved = findUnresolved(draft, activeVariables())

  return (
    <div className="app-urlbar">
      <div className="app-urlbar__method">
        <div style={{ position: 'relative' }}>
          <select
            className="aero-select aero-field--mono"
            style={{ width: '100%', fontWeight: 700 }}
            value={draft.method}
            onChange={(event) => patchDraft({ method: event.target.value as HttpMethod })}
            aria-label="HTTP method"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <span className="aero-select__chevron" aria-hidden="true" />
        </div>
      </div>

      <div className="app-urlbar__url">
        <input
          className="aero-field aero-field--mono"
          style={{ width: '100%' }}
          placeholder="https://api.example.com/v1/resource  —  {{base_url}}/users"
          value={draft.url}
          spellCheck={false}
          onChange={(event) => patchDraft({ url: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void send()
          }}
        />
      </div>

      <div className="app-urlbar__actions">
        {unresolved.length ? (
          <span
            className="aero-tooltip"
            data-tip={`Unresolved variable${unresolved.length === 1 ? '' : 's'}: ${unresolved.join(
              ', '
            )}`}
          >
            <span className="aero-badge aero-badge--warning">
              <Sparkles size={11} />
              {unresolved.length}
            </span>
          </span>
        ) : null}

        {draftOriginId ? (
          <button
            type="button"
            className="aero-button"
            onClick={() => {
              updateSavedRequest()
              notify('Request saved', 'success')
            }}
            title="Save changes to the collection request"
          >
            <Save size={13} />
            Save
          </button>
        ) : (
          <button
            type="button"
            className="aero-button"
            onClick={() => openModal('saveRequest')}
            title="Save this request into a collection"
          >
            <Save size={13} />
            Save
          </button>
        )}

        <button
          type="button"
          className="aero-button aero-button--primary"
          disabled={sending || !draft.url.trim()}
          onClick={() => void send()}
          title="Send request (Ctrl+Enter)"
        >
          {sending ? <Loader2 size={13} className="aero-spinner" /> : <Send size={13} />}
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
