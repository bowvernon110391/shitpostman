import { useEffect } from 'react'
import { Code2, FileText, KeyRound, ListFilter, Lock } from 'lucide-react'
import { useAppStore, type RequestTab } from '../../store/useAppStore'
import { UrlBar } from './UrlBar'
import { ParamsPanel } from './ParamsPanel'
import { HeadersPanel } from './HeadersPanel'
import { BodyPanel } from './BodyPanel'
import { AuthPanel } from './AuthPanel'
import { CodePanel } from './CodePanel'
import { ResponsePanel } from '../response/ResponsePanel'

const TABS: { id: RequestTab; label: string; icon: JSX.Element }[] = [
  { id: 'params', label: 'Params', icon: <ListFilter size={12} /> },
  { id: 'headers', label: 'Headers', icon: <FileText size={12} /> },
  { id: 'body', label: 'Body', icon: <Code2 size={12} /> },
  { id: 'auth', label: 'Auth', icon: <Lock size={12} /> },
  { id: 'code', label: 'Code', icon: <KeyRound size={12} /> }
]

/** The whole right-hand request builder: URL bar, editor tabs and response. */
export function RequestPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const draftName = useAppStore((state) => state.draftName)
  const setDraftName = useAppStore((state) => state.setDraftName)
  const requestTab = useAppStore((state) => state.requestTab)
  const setRequestTab = useAppStore((state) => state.setRequestTab)
  const send = useAppStore((state) => state.send)
  const draftOriginId = useAppStore((state) => state.draftOriginId)
  const updateSavedRequest = useAppStore((state) => state.updateSavedRequest)

  // Ctrl/Cmd+Enter sends from anywhere in the request area.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        void send()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [send])

  const counts: Record<RequestTab, number | null> = {
    params: draft.params.filter((row) => row.enabled && row.key.trim()).length,
    headers: draft.headers.filter((row) => row.enabled && row.key.trim()).length,
    body: draft.body.type === 'none' ? 0 : 1,
    auth: draft.auth.type === 'none' ? 0 : 1,
    code: null
  }

  return (
    <section className="app-request">
      <div className="app-request-title">
        <span className="aero-dim" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
          REQUEST
        </span>
        <input
          className="aero-field app-request-title__input"
          value={draftName}
          spellCheck={false}
          placeholder="Untitled request"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => {
            if (draftOriginId && draftName.trim()) updateSavedRequest()
          }}
        />
        <span className="aero-dim aero-ellipsis" style={{ fontSize: 11, minWidth: 0 }}>
          {draftOriginId ? 'saved in collection' : 'unsaved draft'}
        </span>
      </div>

      <UrlBar />

      <div className="app-workarea">
        <div className="app-pane app-pane--editor">
          <div className="aero-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`aero-tab${requestTab === tab.id ? ' aero-tab--active' : ''}`}
                onClick={() => setRequestTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {counts[tab.id] ? (
                  <span className="aero-tab__count">{counts[tab.id]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="app-pane__body aero-scroll">
            {requestTab === 'params' ? <ParamsPanel /> : null}
            {requestTab === 'headers' ? <HeadersPanel /> : null}
            {requestTab === 'body' ? <BodyPanel /> : null}
            {requestTab === 'auth' ? <AuthPanel /> : null}
            {requestTab === 'code' ? <CodePanel /> : null}
          </div>
        </div>

        <div className="app-pane app-pane--response">
          <ResponsePanel />
        </div>
      </div>
    </section>
  )
}
