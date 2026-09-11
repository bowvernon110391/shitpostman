import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'

/** Frosted window chrome with working minimise / maximise / close buttons. */
export function TitleBar({ center }: { center?: ReactNode }): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let disposed = false
    void window.aero.window.isMaximized().then((value) => {
      if (!disposed) setMaximized(value)
    })

    const unsubscribe = window.aero.window.onStateChange((state) => setMaximized(state.maximized))
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  const toggleMaximize = useCallback(() => {
    void window.aero.window.toggleMaximize().then(setMaximized)
  }, [])

  return (
    <header
      className="aero-titlebar"
      onDoubleClick={(event) => {
        // Ignore double clicks landing on a control.
        if ((event.target as HTMLElement).closest('button, input, select, [data-nodrag]')) return
        toggleMaximize()
      }}
    >
      <div className="aero-titlebar__brand">
        <span aria-hidden="true">🫧</span>
        <span>Shitpostman</span>
        <em>Aero edition</em>
      </div>

      <div className="aero-titlebar__spacer" />

      {center ? <div className="aero-titlebar__center">{center}</div> : null}

      <div className="aero-titlebar__spacer" />

      <div className="aero-window-controls">
        <button
          type="button"
          className="aero-window-control"
          onClick={() => void window.aero.window.minimize()}
          aria-label="Minimise"
          title="Minimise"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="aero-window-control"
          onClick={toggleMaximize}
          aria-label={maximized ? 'Restore' : 'Maximise'}
          title={maximized ? 'Restore' : 'Maximise'}
        >
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          className="aero-window-control aero-window-control--close"
          onClick={() => void window.aero.window.close()}
          aria-label="Close"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>
    </header>
  )
}
