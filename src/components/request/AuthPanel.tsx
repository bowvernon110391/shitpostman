import { KeyRound, ShieldCheck } from 'lucide-react'
import type { AuthConfig, AuthType } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { CopyButton } from '../ui/CopyButton'

const AUTH_TYPES: { value: AuthType; label: string; blurb: string }[] = [
  { value: 'none', label: 'No auth', blurb: 'This request is sent without credentials.' },
  {
    value: 'bearer',
    label: 'Bearer token',
    blurb: 'Adds an `Authorization: Bearer <token>` header.'
  },
  {
    value: 'basic',
    label: 'Basic auth',
    blurb: 'Adds an `Authorization: Basic <base64(user:pass)>` header.'
  },
  {
    value: 'apikey',
    label: 'API key',
    blurb: 'Sends the key as a header or a query parameter.'
  }
]

/** Authentication editor for bearer / basic / API-key schemes. */
export function AuthPanel(): JSX.Element {
  const draft = useAppStore((state) => state.draft)
  const patchDraft = useAppStore((state) => state.patchDraft)
  const activeVariables = useAppStore((state) => state.activeVariables)

  const auth: AuthConfig = draft.auth
  const setAuth = (patch: Partial<AuthConfig>): void => patchDraft({ auth: { ...auth, ...patch } })

  const variables = activeVariables()
  const tokenPreview = (auth.bearerToken ?? '').replace(
    /\{\{([^}]+)\}\}/g,
    (match, name: string) => variables[name.toLowerCase()] ?? match
  )

  const current = AUTH_TYPES.find((entry) => entry.value === auth.type) ?? AUTH_TYPES[0]

  return (
    <div className="app-pane__body--pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="app-field-row">
        <span className="app-field-row__label">Auth type</span>
        <div className="app-field-row__control">
          <div style={{ position: 'relative', maxWidth: 240 }}>
            <select
              className="aero-select"
              style={{ width: '100%' }}
              value={auth.type}
              onChange={(event) => setAuth({ type: event.target.value as AuthType })}
            >
              {AUTH_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
            <span className="aero-select__chevron" aria-hidden="true" />
          </div>
        </div>
      </div>

      <span className="aero-hint">
        <ShieldCheck size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
        {current.blurb} Variables like <code className="aero-mono">{'{{api_token}}'}</code> are
        resolved from the active environment.
      </span>
      <div className="aero-divider" />

      {auth.type === 'none' ? (
        <div className="aero-empty">No authentication is applied to this request.</div>
      ) : null}

      {auth.type === 'bearer' ? (
        <>
          <div className="app-field-row">
            <span className="app-field-row__label">Token</span>
            <div className="app-field-row__control">
              <div className="aero-well" style={{ display: 'flex', alignItems: 'center' }}>
                <KeyRound size={12} className="aero-dim" style={{ margin: '0 6px 0 8px' }} />
                <input
                  className="aero-field aero-field--mono"
                  style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                  placeholder="{{api_token}}"
                  value={auth.bearerToken ?? ''}
                  spellCheck={false}
                  onChange={(event) => setAuth({ bearerToken: event.target.value })}
                />
                <CopyButton value={auth.bearerToken ?? ''} label="Copy token" size={13} />
              </div>
            </div>
          </div>
          {tokenPreview && tokenPreview !== auth.bearerToken ? (
            <span className="aero-hint">
              Resolved: <code className="aero-mono">{tokenPreview}</code>
            </span>
          ) : null}
        </>
      ) : null}

      {auth.type === 'basic' ? (
        <>
          <div className="app-field-row">
            <span className="app-field-row__label">Username</span>
            <div className="app-field-row__control">
              <input
                className="aero-field aero-field--mono"
                placeholder="{{username}}"
                value={auth.basicUsername ?? ''}
                spellCheck={false}
                onChange={(event) => setAuth({ basicUsername: event.target.value })}
              />
            </div>
          </div>
          <div className="app-field-row">
            <span className="app-field-row__label">Password</span>
            <div className="app-field-row__control">
              <input
                className="aero-field aero-field--mono"
                type="password"
                placeholder="{{password}}"
                value={auth.basicPassword ?? ''}
                spellCheck={false}
                onChange={(event) => setAuth({ basicPassword: event.target.value })}
              />
            </div>
          </div>
        </>
      ) : null}

      {auth.type === 'apikey' ? (
        <>
          <div className="app-field-row">
            <span className="app-field-row__label">Key</span>
            <div className="app-field-row__control">
              <input
                className="aero-field aero-field--mono"
                placeholder="X-Api-Key"
                value={auth.apiKeyName ?? ''}
                spellCheck={false}
                onChange={(event) => setAuth({ apiKeyName: event.target.value })}
              />
            </div>
          </div>
          <div className="app-field-row">
            <span className="app-field-row__label">Value</span>
            <div className="app-field-row__control">
              <input
                className="aero-field aero-field--mono"
                placeholder="{{api_token}}"
                value={auth.apiKeyValue ?? ''}
                spellCheck={false}
                onChange={(event) => setAuth({ apiKeyValue: event.target.value })}
              />
            </div>
          </div>
          <div className="app-field-row">
            <span className="app-field-row__label">Add to</span>
            <div className="app-field-row__control">
              <div style={{ position: 'relative', maxWidth: 180 }}>
                <select
                  className="aero-select"
                  style={{ width: '100%' }}
                  value={auth.apiKeyIn ?? 'header'}
                  onChange={(event) =>
                    setAuth({ apiKeyIn: event.target.value as 'header' | 'query' })
                  }
                >
                  <option value="header">Request header</option>
                  <option value="query">Query parameter</option>
                </select>
                <span className="aero-select__chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
