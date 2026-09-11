import { Clock, Database, Globe, Info, Layers, Wifi, WifiOff } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useUiStore } from '../store/useUiStore'
import { countRequests } from '../lib/tree'
import { formatBytes, formatDuration } from '../lib/format'

/** Bottom status strip with live workspace stats. */
export function StatusBar(): JSX.Element {
  const collections = useAppStore((state) => state.collections)
  const environments = useAppStore((state) => state.environments)
  const activeEnvironmentId = useAppStore((state) => state.activeEnvironmentId)
  const response = useAppStore((state) => state.response)
  const responseError = useAppStore((state) => state.responseError)
  const sending = useAppStore((state) => state.sending)
  const settings = useAppStore((state) => state.settings)
  const openModal = useUiStore((state) => state.openModal)

  const active = environments.find((entry) => entry.id === activeEnvironmentId) ?? null
  const requests = collections.reduce(
    (sum, collection) => sum + countRequests(collection.items),
    0
  )

  return (
    <footer className="aero-statusbar">
      <span className="aero-statusbar__item">
        {sending ? (
          <>
            <Wifi size={11} /> Sending…
          </>
        ) : responseError ? (
          <>
            <WifiOff size={11} /> Request failed
          </>
        ) : response ? (
          <>
            <Wifi size={11} /> {response.status} {response.statusText}
          </>
        ) : (
          <>
            <WifiOff size={11} /> Idle
          </>
        )}
      </span>

      {response ? (
        <>
          <span className="aero-statusbar__item">
            <Clock size={11} /> {formatDuration(response.time)}
          </span>
          <span className="aero-statusbar__item">
            <Database size={11} /> {formatBytes(response.size)}
          </span>
        </>
      ) : null}

      <span className="aero-statusbar__spacer" />

      <span className="aero-statusbar__item">
        <Layers size={11} /> {collections.length} collection{collections.length === 1 ? '' : 's'} ·{' '}
        {requests} request{requests === 1 ? '' : 's'}
      </span>
      <span className="aero-statusbar__item">
        <Globe size={11} /> {active ? active.name : 'no environment'}
      </span>
      <span className="aero-statusbar__item">
        <Clock size={11} /> timeout {settings.timeout / 1000}s
      </span>

      <button
        type="button"
        className="aero-button aero-button--icon aero-button--ghost"
        onClick={() => openModal('about')}
        title="About Shitpostman"
      >
        <Info size={12} />
      </button>
    </footer>
  )
}
