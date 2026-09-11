import { Settings } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'

/**
 * Opens the app-wide settings modal. Sits at the end of every sidebar footer, so
 * each tab keeps a single footer bar and Settings remains reachable everywhere.
 */
export function SettingsButton(): JSX.Element {
  const openModal = useUiStore((state) => state.openModal)

  return (
    <button
      type="button"
      className="aero-button aero-button--icon aero-button--ghost"
      onClick={() => openModal('settings')}
      title="Settings"
      aria-label="Settings"
    >
      <Settings size={13} />
    </button>
  )
}
