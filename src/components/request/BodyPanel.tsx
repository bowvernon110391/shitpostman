import { useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { KeyValueEditor } from '../ui/KeyValueEditor'
import { CopyButton } from '../ui/CopyButton'
import { SplitHandle } from '../ui/SplitHandle'
import { useElementSize } from '../../lib/useElementSize'
import { BODY_EDITOR_MIN_H, CORNER_GRIP_SIZE, RESIZE_STEP, clamp } from '../../lib/layout'
import { DEFAULT_SETTINGS, type BodyType, type RawLanguage } from '@shared/types'

const BODY_MODES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form data' },
  { value: 'raw', label: 'Raw' },
  { value: 'graphql', label: 'GraphQL' }
]

const RAW_LANGUAGES: { value: RawLanguage; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' },
  { value: 'javascript', label: 'JavaScript' }
]

const PLACEHOLDER: Record<BodyType, string> = {
  none: '',
  json: '{\n  "name": "Bubbles",\n  "shiny": true\n}',
  form: '',
  raw: 'Plain text body…',
  graphql: 'query GetUser {\n  user(id: "1") {\n    name\n  }\n}'
}

/** The panel's flex column rhythm; the max-height maths has to know it too. */
const COLUMN_GAP = 12

/** Body editor with a Postman-style mode switch. */
export function BodyPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)

  const body = draft.body
  const raw = body.raw ?? ''

  const bodyEditorHeight = useAppStore((state) => state.settings.bodyEditorHeight)
  const updateSettings = useAppStore((state) => state.updateSettings)

  const panelRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const wellRef = useRef<HTMLDivElement>(null)
  const panelSize = useElementSize(panelRef)
  const toolbarSize = useElementSize(toolbarRef)

  const hasEditor = body.type === 'json' || body.type === 'raw' || body.type === 'graphql'

  /*
   * The ceiling is whatever the tab has left once the toolbar and the column
   * gap are paid for -- the grip sits inside the well, so it costs no row of
   * its own. Measuring the ceiling rather than capping at a constant is what
   * keeps the grip reachable: a flat cap would let the well grow until its
   * bottom-right corner, and the grip with it, slid below the fold, where only
   * scrolling finds it again.
   *
   * The measurement is only stable because the panel takes a definite height
   * while the editor is showing (see the root's `height` below). Left at auto
   * height the panel would grow along with the textarea, so "space left over"
   * would always equal the current height and the editor could never grow.
   */
  const chrome = toolbarSize.height + COLUMN_GAP
  const maxHeight = Math.max(BODY_EDITOR_MIN_H, panelSize.height - chrome)
  const editorHeight = clamp(bodyEditorHeight, BODY_EDITOR_MIN_H, maxHeight)

  const setMode = (type: BodyType): void => {
    if (type === 'none') {
      patchDraft({ body: { type: 'none', raw: '', rawLanguage: 'json', formData: [] } })
      return
    }
    if (type === 'form') {
      patchDraft({
        body: { type: 'form', raw: '', rawLanguage: body.rawLanguage ?? 'json', formData: body.formData ?? [] }
      })
      return
    }
    patchDraft({
      body: {
        type,
        raw,
        rawLanguage: type === 'json' ? 'json' : body.rawLanguage ?? 'json',
        formData: body.formData ?? []
      }
    })
  }

  const pretty = (): void => {
    try {
      patchDraft({ body: { ...body, raw: JSON.stringify(JSON.parse(raw), null, 2) } })
    } catch {
      /* leave malformed JSON untouched */
    }
  }

  return (
    <div
      ref={panelRef}
      className="app-pane__body--pad"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: COLUMN_GAP,
        /*
         * Only the modes with a resizable editor take a definite height. The
         * rest stay auto-height, so a tall form-data table still overflows the
         * scroll container as before instead of being squashed by flex-shrink.
         */
        ...(hasEditor ? { height: '100%' } : null)
      }}
    >
      <div
        ref={toolbarRef}
        className="app-toolbar"
        style={{ border: 'none', background: 'none', padding: 0 }}
      >
        <span className="app-toolbar__label">Mode</span>
        <div className="aero-tabs" style={{ background: 'none', boxShadow: 'none', border: 'none', padding: 0 }}>
          {BODY_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={`aero-tab${body.type === mode.value ? ' aero-tab--active' : ''}`}
              onClick={() => setMode(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <span className="app-toolbar__spacer" />
        {(body.type === 'json' || body.type === 'graphql') && (
          <button type="button" className="aero-button aero-button--sm" onClick={pretty}>
            Beautify
          </button>
        )}
        {body.type === 'raw' ? (
          <>
            <span className="app-toolbar__label">Language</span>
            <div style={{ position: 'relative', width: 130 }}>
              <select
                className="aero-select"
                style={{ width: '100%' }}
                value={body.rawLanguage ?? 'json'}
                onChange={(event) =>
                  patchDraft({
                    body: { ...body, rawLanguage: event.target.value as RawLanguage }
                  })
                }
              >
                {RAW_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span className="aero-select__chevron" aria-hidden="true" />
            </div>
          </>
        ) : null}
      </div>

      {body.type === 'none' ? (
        <div className="aero-empty">
          This request has no body. Pick a mode above if you need to send one.
        </div>
      ) : null}

      {body.type === 'form' ? (
        <KeyValueEditor
          rows={body.formData ?? []}
          onChange={(rows) => patchDraft({ body: { ...body, formData: rows } })}
          keyPlaceholder="Field"
          valuePlaceholder="Value"
          showDescription
          emptyHint="No form fields yet."
        />
      ) : null}

      {hasEditor ? (
        <div
          ref={wellRef}
          className="aero-well"
          /*
           * `flex: 0 0 auto` is load-bearing. The default `flex-shrink: 1`
           * would squeeze the well back down to the panel instead of letting
           * it overflow into the scroll container, so the editor could never
           * be made taller than the tab.
           */
          style={{ position: 'relative', flex: '0 0 auto', height: editorHeight }}
        >
          <textarea
            className="aero-field aero-field--mono"
            style={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              // The grip below owns the height instead of the native one.
              resize: 'none'
            }}
            spellCheck={false}
            placeholder={PLACEHOLDER[body.type]}
            value={raw}
            onChange={(event) => patchDraft({ body: { ...body, raw: event.target.value } })}
          />
          <div style={{ position: 'absolute', top: 4, right: 6 }}>
            <CopyButton value={raw} label="Copy body" size={13} />
          </div>
          {/*
           * Pinned inside the well rather than after it, so it rides the
           * bottom-right corner as the editor grows -- the same affordance a
           * native resizable textarea shows. It measures against the well's
           * top edge, which stays put while the grip moves.
           */}
          <SplitHandle
            axis="y"
            appearance="corner"
            value={editorHeight}
            min={BODY_EDITOR_MIN_H}
            max={maxHeight}
            step={RESIZE_STEP}
            label="Body editor height"
            fromPointer={(clientY) => {
              const rect = wellRef.current?.getBoundingClientRect()
              if (!rect) return editorHeight
              /*
               * Half a grip, because the grip is pinned inside the well and the
               * pointer therefore holds it by its middle -- half its height
               * above the well's bottom edge. Measuring to the top edge alone
               * lands that much short: the first move of a drag snapped the
               * editor ~10px smaller, and it stayed that much smaller for the
               * rest of the gesture. Adding it back keeps the grip under the
               * cursor.
               *
               * The well's 1px border insets a `bottom: 0` child, so this is
               * left a pixel shy rather than hardcoding a border width here.
               */
              return clientY - rect.top + CORNER_GRIP_SIZE / 2
            }}
            onChange={(next) => updateSettings({ bodyEditorHeight: Math.round(next) })}
            onReset={() => updateSettings({ bodyEditorHeight: DEFAULT_SETTINGS.bodyEditorHeight })}
          />
        </div>
      ) : null}
    </div>
  )
}
