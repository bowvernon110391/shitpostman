import { useState } from 'react'
import { FolderOpen, Info, RotateCcw, Save, Upload } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { Modal } from '../ui/Modal'
import { importPostmanCollection } from '../../lib/postman'
import { importFromFile, JSON_FILTER } from '../../lib/fileIO'

/** Settings + import panel. */
export function SettingsModal(): JSX.Element {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const resetAll = useAppStore((state) => state.resetAll)
  const importCollections = useAppStore((state) => state.importCollections)
  const notify = useAppStore((state) => state.notify)
  const closeModal = useUiStore((state) => state.closeModal)
  const askConfirm = useUiStore((state) => state.askConfirm)

  const [pasted, setPasted] = useState('')
  const [storePath, setStorePath] = useState<string | null>(null)

  const reveal = async (): Promise<void> => {
    const path = await window.aero.getStorePath()
    setStorePath(path)
    await window.aero.revealStoreFile()
  }

  const importPasted = (): void => {
    const result = importPostmanCollection(pasted)
    if (!result.collections.length) {
      for (const error of result.errors) notify(error, 'warning')
      if (!result.errors.length) notify('Nothing importable was found', 'warning')
      return
    }
    importCollections(result.collections)
    notify(`Imported ${result.collections.length} collection(s)`, 'success')
    setPasted('')
    closeModal()
  }

  const importFile = async (): Promise<void> => {
    const content = await importFromFile({ filters: [JSON_FILTER] })
    if (!content) return
    setPasted(content)
  }

  return (
    <Modal
      title="Settings"
      wide
      onClose={closeModal}
      footer={
        <>
          <button
            type="button"
            className="aero-button aero-button--danger"
            onClick={() =>
              askConfirm({
                title: 'Reset everything',
                message:
                  'All collections, environments and history will be deleted and the sample data restored. This cannot be undone.',
                confirmLabel: 'Reset',
                danger: true,
                onConfirm: () => {
                  void resetAll()
                  closeModal()
                }
              })
            }
          >
            <RotateCcw size={13} />
            Reset app data
          </button>
          <span className="aero-modal__footer-spacer" />
          <button type="button" className="aero-button aero-button--primary" onClick={closeModal}>
            Close
          </button>
        </>
      }
    >
      <div className="app-stack">
        <div className="aero-section__title">Request behaviour</div>

        <div className="app-field-row">
          <span className="app-field-row__label">Timeout (ms)</span>
          <div className="app-field-row__control">
            <input
              className="aero-field aero-field--mono"
              type="number"
              min={1000}
              step={1000}
              style={{ maxWidth: 160 }}
              value={settings.timeout}
              onChange={(event) =>
                updateSettings({ timeout: Math.max(1000, Number(event.target.value) || 30000) })
              }
            />
          </div>
        </div>

        <div className="app-field-row">
          <span className="app-field-row__label">History size</span>
          <div className="app-field-row__control">
            <input
              className="aero-field aero-field--mono"
              type="number"
              min={10}
              max={2000}
              step={10}
              style={{ maxWidth: 160 }}
              value={settings.maxHistory}
              onChange={(event) =>
                updateSettings({ maxHistory: Math.max(10, Number(event.target.value) || 200) })
              }
            />
          </div>
        </div>

        <label className="app-switch">
          <input
            type="checkbox"
            checked={settings.followRedirects}
            onChange={(event) => updateSettings({ followRedirects: event.target.checked })}
          />
          <span>Follow redirects automatically</span>
        </label>

        <label className="app-switch">
          <input
            type="checkbox"
            checked={settings.sslVerification}
            onChange={(event) => updateSettings({ sslVerification: event.target.checked })}
          />
          <span>Verify SSL certificates</span>
        </label>

        <label className="app-switch">
          <input
            type="checkbox"
            checked={settings.sounds}
            onChange={(event) => updateSettings({ sounds: event.target.checked })}
          />
          <span>Play a chime when a response arrives</span>
        </label>

        <div className="aero-divider" />
        <div className="aero-section__title">Data</div>

        <div className="app-field-row">
          <span className="app-field-row__label">Storage</span>
          <div className="app-field-row__control">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="aero-button aero-button--sm" onClick={() => void reveal()}>
                <FolderOpen size={12} />
                Show data file
              </button>
              <span className="aero-hint aero-ellipsis" style={{ maxWidth: 320 }}>
                {storePath ?? 'Collections, environments and history are saved as JSON.'}
              </span>
            </div>
          </div>
        </div>

        <div className="aero-divider" />
        <div className="aero-section__title">Import a Postman collection</div>

        <div className="app-field-row">
          <span className="app-field-row__label">From file</span>
          <div className="app-field-row__control">
            <button type="button" className="aero-button aero-button--sm" onClick={() => void importFile()}>
              <Upload size={12} />
              Choose a .json file
            </button>
          </div>
        </div>

        <div className="app-stack">
          <span className="app-field-row__label">Or paste JSON</span>
          <div className="aero-well">
            <textarea
              className="aero-field aero-field--mono"
              style={{
                width: '100%',
                minHeight: 150,
                border: 'none',
                background: 'transparent',
                boxShadow: 'none',
                resize: 'vertical'
              }}
              spellCheck={false}
              placeholder='{ "info": { "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, "item": [ … ] }'
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
          </div>
          <div>
            <button
              type="button"
              className="aero-button aero-button--primary aero-button--sm"
              disabled={!pasted.trim()}
              onClick={importPasted}
            >
              <Save size={12} />
              Import
            </button>
          </div>
        </div>

        <span className="aero-hint">
          <Info size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Shitpostman stores everything locally. Nothing is uploaded anywhere.
        </span>
      </div>
    </Modal>
  )
}
