import { useEffect, useRef, type CSSProperties } from 'react'
import { DEFAULT_SETTINGS } from '@shared/types'
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
import { SplitHandle } from './components/ui/SplitHandle'
import { RESIZE_STEP, SIDEBAR_MAX_W, SIDEBAR_MIN_W } from './lib/layout'
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
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const started = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // React StrictMode runs effects twice in dev — hydrate exactly once.
  useEffect(() => {
    if (started.current) return
    started.current = true
    void hydrate()
  }, [hydrate])

  // Ctrl/Cmd+B toggles the rail. The current value is read off the store rather
  // than closed over, so this listener never needs rebinding.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') return
      event.preventDefault()
      updateSettings({ sidebarCollapsed: !useAppStore.getState().settings.sidebarCollapsed })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [updateSettings])

  const collapsed = settings.sidebarCollapsed

  return (
    <div className="aero-shell">
      <AeroBackground />

      <TitleBar center={<EnvironmentSelector />} />

      {hydrated ? (
        <div
          ref={bodyRef}
          className="aero-body"
          /*
           * One custom property drives the rail — `.aero-sidebar` already sizes
           * itself from `--sidebar-w`, so a drag only ever writes this.
           */
          style={{ '--sidebar-w': `${settings.sidebarWidth}px` } as CSSProperties}
        >
          <CollectionSidebar collapsed={collapsed} />

          {collapsed ? null : (
            <SplitHandle
              axis="x"
              value={settings.sidebarWidth}
              min={SIDEBAR_MIN_W}
              max={SIDEBAR_MAX_W}
              step={RESIZE_STEP}
              label="Sidebar width"
              // The rail is flush with the body's left edge, so the pointer's
              // offset from that edge is the width itself.
              fromPointer={(clientX) =>
                clientX - (bodyRef.current?.getBoundingClientRect().left ?? 0)
              }
              onChange={(next) => updateSettings({ sidebarWidth: Math.round(next) })}
              onReset={() => updateSettings({ sidebarWidth: DEFAULT_SETTINGS.sidebarWidth })}
            />
          )}

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
