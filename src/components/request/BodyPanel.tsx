import { useAppStore } from '../../store/useAppStore'
import { KeyValueEditor } from '../ui/KeyValueEditor'
import { CopyButton } from '../ui/CopyButton'
import type { BodyType, RawLanguage } from '@shared/types'

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

/** Body editor with a Postman-style mode switch. */
export function BodyPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)

  const body = draft.body
  const raw = body.raw ?? ''

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
    <div className="app-pane__body--pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="app-toolbar" style={{ border: 'none', background: 'none', padding: 0 }}>
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

      {body.type === 'json' || body.type === 'raw' || body.type === 'graphql' ? (
        <div className="aero-well" style={{ position: 'relative', flex: '1 1 auto', minHeight: 180 }}>
          <textarea
            className="aero-field aero-field--mono"
            style={{
              width: '100%',
              height: '100%',
              minHeight: 180,
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
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
        </div>
      ) : null}
    </div>
  )
}
