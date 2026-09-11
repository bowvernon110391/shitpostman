import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'

/** Global yes/no confirmation dialog driven by `useUiStore().askConfirm`. */
export function ConfirmDialog(): JSX.Element | null {
  const confirm = useUiStore((state) => state.confirm)
  const closeConfirm = useUiStore((state) => state.closeConfirm)

  if (!confirm) return null

  const accept = (): void => {
    closeConfirm()
    confirm.onConfirm()
  }

  return (
    <div className="aero-modal-scrim" role="presentation" onClick={closeConfirm}>
      <div
        className="aero-modal"
        style={{ width: 420 }}
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="aero-modal__header">
          <span className="aero-modal__title">
            {confirm.danger ? <AlertTriangle size={14} /> : <HelpCircle size={14} />}
            {confirm.title}
          </span>
        </div>
        <div className="aero-modal__body">
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>{confirm.message}</span>
        </div>
        <div className="aero-modal__footer">
          <span className="aero-modal__footer-spacer" />
          <button type="button" className="aero-button" onClick={closeConfirm} autoFocus>
            Cancel
          </button>
          <button
            type="button"
            className={`aero-button ${confirm.danger ? 'aero-button--danger' : 'aero-button--primary'}`}
            onClick={accept}
          >
            {confirm.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
