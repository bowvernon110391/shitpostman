import { useEffect, useRef, type CSSProperties } from 'react'
import { Code2, FileText, KeyRound, ListFilter, Lock } from 'lucide-react'
import { DEFAULT_SETTINGS, isEnabled } from '@shared/types'
import { useAppStore, type RequestTab } from '../../store/useAppStore'
import { HANDLE_SIZE, RESIZE_STEP, clamp, paneLimits, ratioLimits } from '../../lib/layout'
import { useElementSize } from '../../lib/useElementSize'
import { SplitHandle } from '../ui/SplitHandle'
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
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  const workareaRef = useRef<HTMLDivElement>(null)
  const workareaSize = useElementSize(workareaRef)

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
    params: draft.params.filter(isEnabled).length,
    headers: draft.headers.filter(isEnabled).length,
    body: draft.body.type === 'none' ? 0 : 1,
    auth: draft.auth.type === 'none' ? 0 : 1,
    code: null
  }

  /*
   * The panes are sized by an inline percentage `flex-basis`, so flipping the
   * orientation only changes which axis that percentage resolves against and
   * CSS does the rest. Only the px floors need the measured extent, which is
   * what `useElementSize` provides.
   */
  const { paneLayout, responseMaximized } = settings
  const axis = paneLayout === 'sideBySide' ? 'x' : 'y'
  const extent = axis === 'x' ? workareaSize.width : workareaSize.height
  const limits = paneLimits(paneLayout)
  const bounds = ratioLimits(extent, limits.leading, limits.trailing)
  const ratio = clamp(
    axis === 'x' ? settings.editorRatioX : settings.editorRatioY,
    bounds.min,
    bounds.max
  )

  const editorStyle: CSSProperties = {
    flexBasis: `${ratio * 100}%`,
    flexGrow: 0,
    flexShrink: 0
  }

  /*
   * Clamping happens on read rather than being written back to the store: a
   * window resize can push the stored ratio out of bounds, and writing during
   * render would loop.
   *
   * px and ratio convert through `extent`, never through the space left over
   * after the handle. `flex-basis` percentages resolve against the whole
   * container, so dividing by the net figure inflates every value by
   * `extent / (extent - HANDLE_SIZE)` and the split drifts away from the
   * cursor.
   */
  const splitValue = ratio * extent
  // `extent - handle - trailing` can fall below the leading floor in a very
  // small window; preferring the floor keeps the range from inverting.
  const splitMax = Math.max(limits.leading, extent - HANDLE_SIZE - limits.trailing)

  const fromPointer = (clientPos: number): number => {
    const rect = workareaRef.current?.getBoundingClientRect()
    if (!rect) return splitValue
    return clientPos - (axis === 'x' ? rect.left : rect.top)
  }

  const changeSplit = (next: number): void => {
    if (extent <= 0) return
    const nextRatio = next / extent
    updateSettings(axis === 'x' ? { editorRatioX: nextRatio } : { editorRatioY: nextRatio })
  }

  const resetSplit = (): void => {
    updateSettings(
      axis === 'x'
        ? { editorRatioX: DEFAULT_SETTINGS.editorRatioX }
        : { editorRatioY: DEFAULT_SETTINGS.editorRatioY }
    )
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

      <div
        ref={workareaRef}
        className={`app-workarea${paneLayout === 'sideBySide' ? ' app-workarea--sideBySide' : ''}`}
      >
        <div
          className="app-pane app-pane--editor"
          style={responseMaximized ? { display: 'none' } : editorStyle}
        >
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

        {responseMaximized ? null : (
          <SplitHandle
            axis={axis}
            value={splitValue}
            min={limits.leading}
            max={splitMax}
            step={RESIZE_STEP}
            label={axis === 'x' ? 'Editor width' : 'Editor height'}
            fromPointer={fromPointer}
            onChange={changeSplit}
            onReset={resetSplit}
          />
        )}

        <div className="app-pane app-pane--response">
          <ResponsePanel />
        </div>
      </div>
    </section>
  )
}
