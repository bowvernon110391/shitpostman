import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Glass modal rendered in a portal, closes on Escape or scrim click. */
export function Modal({ title, onClose, children, footer, wide = false }: ModalProps): JSX.Element {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="aero-modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`aero-modal${wide ? ' aero-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="aero-modal__header">
          <h2 className="aero-modal__title">{title}</h2>
          <button
            type="button"
            className="aero-button aero-button--icon aero-button--ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        <div className="aero-modal__body aero-scroll">{children}</div>

        {footer ? <footer className="aero-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  )
}
