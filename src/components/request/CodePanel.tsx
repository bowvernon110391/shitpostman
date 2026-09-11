import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { CODE_LANGUAGES, generateCode, type CodeLanguage } from '../../lib/codegen'
import { CopyButton } from '../ui/CopyButton'

/** Generates ready-to-paste client code for the current request. */
export function CodePanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const resolvedDraft = useAppStore((state) => state.resolvedDraft)
  const [language, setLanguage] = useState<CodeLanguage>('curl')

  const config = resolvedDraft() ?? draft
  const snippet = generateCode(config, language)

  return (
    <div className="app-pane__body--pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="app-toolbar" style={{ border: 'none', background: 'none', padding: 0 }}>
        <span className="app-toolbar__label">Language</span>
        <div style={{ position: 'relative', width: 190 }}>
          <select
            className="aero-select"
            style={{ width: '100%' }}
            value={language}
            onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
          >
            {CODE_LANGUAGES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
          <span className="aero-select__chevron" aria-hidden="true" />
        </div>
        <span className="app-toolbar__spacer" />
        <CopyButton value={snippet} label="Copy snippet" size={13} />
      </div>

      <div className="aero-well" style={{ flex: '1 1 auto', minHeight: 0 }}>
        <pre className="app-code app-code--wrap" style={{ margin: 0 }}>
          {snippet}
        </pre>
      </div>
    </div>
  )
}
