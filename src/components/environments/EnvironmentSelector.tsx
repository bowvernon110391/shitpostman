import { Globe, Sliders } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'

/** Compact environment switcher shown in the title bar. */
export function EnvironmentSelector(): JSX.Element {
  const environments = useAppStore((state) => state.environments)
  const activeEnvironmentId = useAppStore((state) => state.activeEnvironmentId)
  const setActiveEnvironment = useAppStore((state) => state.setActiveEnvironment)
  const openModal = useUiStore((state) => state.openModal)

  const active = environments.find((entry) => entry.id === activeEnvironmentId) ?? null
  const variables = active ? active.variables.filter((row) => row.key.trim()).length : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Globe size={12} />
      <div style={{ position: 'relative' }}>
        <select
          className="aero-select"
          style={{ minWidth: 190, padding: '4px 24px 4px 9px', fontSize: 12 }}
          value={activeEnvironmentId ?? ''}
          onChange={(event) => setActiveEnvironment(event.target.value || null)}
          aria-label="Active environment"
        >
          <option value="">No environment</option>
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </select>
        <span className="aero-select__chevron" aria-hidden="true" />
      </div>

      <button
        type="button"
        className="aero-button aero-button--icon aero-button--ghost"
        title={active ? `Edit “${active.name}” (${variables} variables)` : 'Manage environments'}
        onClick={() => {
          if (active) openModal('environment', active.id)
          else openModal('settings')
        }}
      >
        <Sliders size={12} />
      </button>
    </div>
  )
}
