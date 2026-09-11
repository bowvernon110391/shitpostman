import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last line of defence: without this a single render error blanks the whole
 * window with no way to tell what happened (Electron hides the console).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Shitpostman crashed while rendering', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="aero-shell">
        <div className="app-placeholder">
          <span style={{ fontSize: 44, lineHeight: 1 }}>🫧</span>
          <span className="app-placeholder__title">Something popped the bubbles</span>
          <span className="app-placeholder__hint">
            {error.message || 'An unexpected error occurred while rendering the interface.'}
          </span>
          <button
            type="button"
            className="aero-button aero-button--primary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
          <button
            type="button"
            className="aero-button aero-button--ghost aero-button--sm"
            onClick={() => void window.location.reload()}
          >
            Reload window
          </button>
        </div>
      </div>
    )
  }
}
