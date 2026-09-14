import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Database,
  Download,
  Eye,
  FileCode2,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { JsonViewer } from './JsonViewer'
import { CopyButton } from '../ui/CopyButton'
import {
  base64ToDataUrl,
  contentTypeLabel,
  formatBytes,
  formatDuration,
  isHtmlType,
  isImageType,
  statusTone,
  tryPrettyJson
} from '../../lib/format'
import { exportToFile, ALL_FILTER } from '../../lib/fileIO'
import type { ResponseTab } from '../../store/useAppStore'

type BodyView = 'pretty' | 'raw' | 'preview'

const EXTENSIONS: Record<string, string> = {
  'application/json': 'json',
  'text/html': 'html',
  'text/xml': 'xml',
  'application/xml': 'xml',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
}

function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()] ?? 'txt'
}

/** Reads a `Set-Cookie` header into individual cookie strings. */
function parseCookies(header: string | undefined): string[] {
  if (!header) return []
  return header
    .split(/,(?=\s*[^;,=]+=[^;,]*)/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Status line, body/headers/cookies tabs, and rich previews. */
export function ResponsePanel(): JSX.Element {
  const response = useAppStore((state) => state.response)
  const responseError = useAppStore((state) => state.responseError)
  const sending = useAppStore((state) => state.sending)
  const responseTab = useAppStore((state) => state.responseTab)
  const setResponseTab = useAppStore((state) => state.setResponseTab)
  const clearResponse = useAppStore((state) => state.clearResponse)
  const notify = useAppStore((state) => state.notify)
  const responseMaximized = useAppStore((state) => state.settings.responseMaximized)
  const updateSettings = useAppStore((state) => state.updateSettings)

  const [bodyView, setBodyView] = useState<BodyView>('pretty')

  // Bulk expand/collapse for the pretty JSON tree. `revision` is bumped so the
  // tree re-applies `mode` even when the value itself has not changed.
  const [jsonMode, setJsonMode] = useState(true)
  const [jsonRevision, setJsonRevision] = useState(0)

  const expandAllJson = (next: boolean): void => {
    setJsonMode(next)
    setJsonRevision((current) => current + 1)
  }

  const parsedJson = useMemo(
    () => (response && response.dataEncoding === 'utf8' ? tryPrettyJson(response.data) : null),
    [response]
  )

  // Every new response opens fully expanded.
  useEffect(() => {
    setJsonMode(true)
    setJsonRevision((current) => current + 1)
  }, [response])

  const cookies = useMemo(() => {
    if (!response) return []
    const key = Object.keys(response.headers).find(
      (name) => name.toLowerCase() === 'set-cookie'
    )
    return parseCookies(key ? response.headers[key] : undefined)
  }, [response])

  const saveResponse = async (): Promise<void> => {
    if (!response) return
    const extension = extensionFor(response.contentType)
    const result = await exportToFile({
      defaultPath: `response.${extension}`,
      content: response.data,
      encoding: response.dataEncoding,
      filters: [ALL_FILTER]
    })
    if (result.saved) notify('Response saved', 'success')
  }

  /* ------------------------------ idle state ----------------------------- */

  if (sending) {
    return (
      <div className="app-placeholder">
        <Loader2 size={26} className="aero-spinner" />
        <span className="app-placeholder__title">Sending request…</span>
      </div>
    )
  }

  if (responseError) {
    return (
      <div className="app-pane__body--pad">
        <div className="app-error-card">
          <span className="app-error-card__title">
            <AlertTriangle size={13} /> {responseError.error}
          </span>
          {responseError.code ? (
            <span className="app-error-card__body">
              Error code: <code className="aero-mono">{responseError.code}</code>
            </span>
          ) : null}
          <span className="app-error-card__body">
            Check the URL, your network connection, the request timeout in Settings, or whether the
            target refuses connections from this app.
          </span>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="app-placeholder">
        <Database size={30} className="aero-dim" />
        <span className="app-placeholder__title">No response yet</span>
        <span className="app-placeholder__hint">
          Hit <strong>Send</strong> (or press Ctrl+Enter) to run this request.
        </span>
      </div>
    )
  }

  const tone = statusTone(response.status)
  const image = isImageType(response.contentType)
  const html = isHtmlType(response.contentType)

  return (
    <>
      <div className="app-toolbar">
        <span className={`aero-badge aero-badge--${tone}`}>
          {response.status} {response.statusText}
        </span>
        <span className="app-toolbar__label">
          <Clock size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          {formatDuration(response.time)}
        </span>
        <span className="app-toolbar__label">
          <Database size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          {formatBytes(response.size)}
        </span>
        <span className="app-chip">{contentTypeLabel(response.contentType)}</span>
        {response.redirects.length ? (
          <span className="aero-tooltip" data-tip={response.redirects.join('\n')}>
            <span className="aero-badge aero-badge--info">
              {response.redirects.length} redirect{response.redirects.length === 1 ? '' : 's'}
            </span>
          </span>
        ) : null}

        <span className="app-toolbar__spacer" />

        <button
          type="button"
          className="aero-button aero-button--icon aero-button--ghost"
          onClick={() => updateSettings({ responseMaximized: !responseMaximized })}
          title={responseMaximized ? 'Restore the editor' : 'Maximize the response'}
        >
          {responseMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          className="aero-button aero-button--sm"
          onClick={() => void saveResponse()}
          title="Save response to a file"
        >
          <Download size={12} />
          Save
        </button>
        <button
          type="button"
          className="aero-button aero-button--icon aero-button--ghost"
          onClick={clearResponse}
          title="Clear response"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="aero-tabs">
        {(['body', 'headers', 'cookies'] as ResponseTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`aero-tab${responseTab === tab ? ' aero-tab--active' : ''}`}
            onClick={() => setResponseTab(tab)}
          >
            <span style={{ textTransform: 'capitalize' }}>{tab}</span>
            {tab === 'headers' ? (
              <span className="aero-tab__count">{Object.keys(response.headers).length}</span>
            ) : null}
            {tab === 'cookies' && cookies.length ? (
              <span className="aero-tab__count">{cookies.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {responseTab === 'body' ? (
        <>
          <div className="app-inner-tabs">
            {(['pretty', 'raw', 'preview'] as BodyView[]).map((view) => (
              <button
                key={view}
                type="button"
                className={`aero-tab${bodyView === view ? ' aero-tab--active' : ''}`}
                onClick={() => setBodyView(view)}
              >
                {view === 'preview' ? <Eye size={11} /> : null}
                {view === 'raw' ? <FileCode2 size={11} /> : null}
                <span style={{ textTransform: 'capitalize' }}>{view}</span>
              </button>
            ))}

            {bodyView === 'pretty' && parsedJson ? (
              <>
                <span className="app-toolbar__spacer" />
                <button
                  type="button"
                  className="aero-button aero-button--sm aero-button--ghost"
                  onClick={() => expandAllJson(true)}
                  title="Expand every node"
                >
                  <ChevronsDown size={12} />
                  Expand all
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--sm aero-button--ghost"
                  onClick={() => expandAllJson(false)}
                  title="Collapse every node"
                >
                  <ChevronsUp size={12} />
                  Collapse all
                </button>
              </>
            ) : null}
          </div>

          <div className="app-pane__body aero-scroll">
            {bodyView === 'pretty' ? (
              parsedJson ? (
                <JsonViewer value={parsedJson.parsed} mode={jsonMode} revision={jsonRevision} />
              ) : (
                <pre className="app-code app-code--wrap aero-selectable" style={{ margin: 0 }}>
                  {response.data || '(empty body)'}
                </pre>
              )
            ) : null}

            {bodyView === 'raw' ? (
              <div style={{ position: 'relative' }}>
                <CopyButton
                  value={response.data}
                  label="Copy body"
                  size={13}
                />
                <pre className="app-code app-code--wrap aero-selectable" style={{ margin: 0 }}>
                  {response.data || '(empty body)'}
                </pre>
              </div>
            ) : null}

            {bodyView === 'preview' ? (
              <div className="app-preview">
                {image ? (
                  <img
                    className="app-preview__image"
                    alt="Response preview"
                    src={base64ToDataUrl(response.data, response.contentType)}
                  />
                ) : html ? (
                  <iframe
                    className="app-preview__frame"
                    title="Response preview"
                    sandbox=""
                    srcDoc={response.data}
                  />
                ) : (
                  <span className="app-placeholder__hint">
                    No visual preview available for {contentTypeLabel(response.contentType)}. Use the
                    Pretty or Raw view instead.
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {responseTab === 'headers' ? (
        <div className="app-pane__body aero-scroll">
          <div className="aero-kv">
            {/* Three tracks only: name, value, copy action. A stray leading
                span here used to shift the captions a column right. */}
            <div className="aero-kv__head" style={{ gridTemplateColumns: '1fr 1.6fr 34px' }}>
              <span>Header</span>
              <span>Value</span>
              <span />
            </div>
            {Object.entries(response.headers).map(([name, value]) => (
              <div
                key={name}
                className="aero-kv__row"
                style={{ gridTemplateColumns: '1fr 1.6fr 34px' }}
              >
                <span className="app-json__key aero-selectable">{name}</span>
                <span className="aero-mono aero-selectable aero-ellipsis" title={value}>
                  {value}
                </span>
                <CopyButton value={value} label="value" iconOnly size={13} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {responseTab === 'cookies' ? (
        <div className="app-pane__body aero-scroll">
          {cookies.length ? (
            <div className="app-list">
              {cookies.map((cookie) => (
                <div key={cookie} className="app-list__row">
                  <div className="app-list__main">
                    <span className="app-list__title aero-mono aero-selectable">{cookie}</span>
                  </div>
                  <div className="app-list__actions">
                    <CopyButton value={cookie} label="cookie" iconOnly size={13} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aero-empty">This response did not set any cookies.</div>
          )}
        </div>
      ) : null}
    </>
  )
}
