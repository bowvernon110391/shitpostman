import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useAppStore, type Toast } from '../store/useAppStore'

const ICONS: Record<Toast['tone'], JSX.Element> = {
  success: <CheckCircle2 size={15} />,
  info: <Info size={15} />,
  warning: <AlertTriangle size={15} />,
  danger: <XCircle size={15} />
}

/** Bottom-right stack of transient notifications. */
export function Toasts(): JSX.Element {
  const toasts = useAppStore((state) => state.toasts)
  const dismiss = useAppStore((state) => state.dismissToast)

  return (
    <div className="app-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`app-toast app-toast--${toast.tone}`}
          onClick={() => dismiss(toast.id)}
          role="status"
        >
          <span className="app-toast__bar" />
          {ICONS[toast.tone]}
          <span className="aero-ellipsis">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
