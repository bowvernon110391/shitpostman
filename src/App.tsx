import { useEffect, useRef } from 'react'
import { AeroBackground } from './components/AeroBackground'
import { TitleBar } from './components/TitleBar'
import { Toasts } from './components/Toasts'
import { StatusBar } from './components/StatusBar'
import { CollectionSidebar } from './components/collections/CollectionSidebar'
import { RequestPanel } from './components/request/RequestPanel'
import { EnvironmentSelector } from './components/environments/EnvironmentSelector'
import { SaveRequestModal } from './components/modals/SaveRequestModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { EnvironmentModal } from './components/modals/EnvironmentModal'
import { AboutModal } from './components/modals/AboutModal'
import { ConfirmDialog } from './components/modals/ConfirmDialog'
import { ContextMenu } from './components/ui/ContextMenu'
import { useAppStore } from './store/useAppStore'
import { useUiStore } from './store/useUiStore'

/** Renders whichever modal is currently requested. */
function ModalHost(): JSX.Element | null {
  const modal = useUiStore((state) => state.modal)

  switch (modal) {
    case 'saveRequest':
      return <SaveRequestModal />
    case 'settings':
      return <SettingsModal />
    case 'environment':
      return <EnvironmentModal />
    case 'about':
      return <AboutModal />
    default:
      return null
  }
}

/** Renders the floating context menu, if one is open. */
function MenuHost(): JSX.Element | null {
  const menu = useUiStore((state) => state.menu)
  const closeMenu = useUiStore((state) => state.closeMenu)

  if (!menu) return null
  return <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
}

function Splash(): JSX.Element {
  return (
    <div className="app-placeholder">
      <span style={{ fontSize: 46, lineHeight: 1 }}>🫧</span>
      <span className="app-placeholder__title">Shitpostman</span>
      <span className="app-placeholder__hint">warming up the bubbles…</span>
    </div>
  )
}

export default function App(): JSX.Element {
  const hydrate = useAppStore((state) => state.hydrate)
  const hydrated = useAppStore((state) => state.hydrated)
  const started = useRef(false)

  // React StrictMode runs effects twice in dev — hydrate exactly once.
  useEffect(() => {
    if (started.current) return
    started.current = true
    void hydrate()
  }, [hydrate])

  return (
    <div className="aero-shell">
      <AeroBackground />

      <TitleBar center={<EnvironmentSelector />} />

      {hydrated ? (
        <div className="aero-body">
          <CollectionSidebar />
          <main className="aero-main">
            <RequestPanel />
          </main>
        </div>
      ) : (
        <Splash />
      )}

      <StatusBar />

      <Toasts />
      <MenuHost />
      <ModalHost />
      <ConfirmDialog />
    </div>
  )
}
