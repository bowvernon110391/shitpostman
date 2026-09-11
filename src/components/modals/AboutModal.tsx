import { Droplets, Github, Sparkles } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'
import { Modal } from '../ui/Modal'

/** Credits / about dialog. */
export function AboutModal(): JSX.Element {
  const closeModal = useUiStore((state) => state.closeModal)

  return (
    <Modal
      title="About Shitpostman"
      onClose={closeModal}
      footer={
        <>
          <span className="aero-modal__footer-spacer" />
          <button type="button" className="aero-button aero-button--primary" onClick={closeModal}>
            Nice
          </button>
        </>
      }
    >
      <div className="app-stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }}>
        <span style={{ fontSize: 40, lineHeight: 1 }}>🫧</span>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Shitpostman</span>
        <span className="aero-dim" style={{ fontSize: 12 }}>
          Aero edition · v1.0.0
        </span>
        <span className="aero-hint" style={{ maxWidth: 340 }}>
          A desktop API client with a Frutiger Aero soul — glossy glass, tropical bubbles and frutiger
          gradients. Requests run in the main process so there is no browser CORS in the way.
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="app-chip">
            <Droplets size={11} /> Electron
          </span>
          <span className="app-chip">
            <Sparkles size={11} /> React + Zustand
          </span>
          <span className="app-chip">
            <Github size={11} /> Postman v2.1 import
          </span>
        </div>
      </div>
    </Modal>
  )
}
