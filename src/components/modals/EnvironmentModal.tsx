import { useEffect, useState } from 'react'
import { Globe, Info, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { Modal } from '../ui/Modal'
import { KeyValueEditor } from '../ui/KeyValueEditor'

/** Edits an environment's name and variables. */
export function EnvironmentModal(): JSX.Element | null {
  const payload = useUiStore((state) => state.modalPayload)
  const closeModal = useUiStore((state) => state.closeModal)
  const askConfirm = useUiStore((state) => state.askConfirm)

  const environments = useAppStore((state) => state.environments)
  const renameEnvironment = useAppStore((state) => state.renameEnvironment)
  const updateEnvironmentRows = useAppStore((state) => state.updateEnvironmentRows)
  const deleteEnvironment = useAppStore((state) => state.deleteEnvironment)
  const setActiveEnvironment = useAppStore((state) => state.setActiveEnvironment)
  const activeEnvironmentId = useAppStore((state) => state.activeEnvironmentId)

  const environment = environments.find((entry) => entry.id === payload) ?? null
  const [name, setName] = useState(environment?.name ?? '')

  const environmentId = environment?.id ?? null
  useEffect(() => {
    setName(environment?.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId])

  if (!environment) return null

  const commitName = (): void => {
    const trimmed = name.trim()
    if (trimmed) renameEnvironment(environment.id, trimmed)
    else setName(environment.name)
  }

  return (
    <Modal
      title="Environment"
      wide
      onClose={closeModal}
      footer={
        <>
          <button
            type="button"
            className="aero-button aero-button--danger"
            onClick={() =>
              askConfirm({
                title: 'Delete environment',
                message: `“${environment.name}” and its variables will be removed.`,
                confirmLabel: 'Delete',
                danger: true,
                onConfirm: () => {
                  deleteEnvironment(environment.id)
                  closeModal()
                }
              })
            }
          >
            <Trash2 size={13} />
            Delete
          </button>
          <span className="aero-modal__footer-spacer" />
          <button
            type="button"
            className="aero-button"
            disabled={activeEnvironmentId === environment.id}
            onClick={() => setActiveEnvironment(environment.id)}
          >
            <Globe size={13} />
            {activeEnvironmentId === environment.id ? 'Active' : 'Use this environment'}
          </button>
          <button type="button" className="aero-button aero-button--primary" onClick={closeModal}>
            Done
          </button>
        </>
      }
    >
      <div className="app-stack">
        <div className="app-field-row">
          <span className="app-field-row__label">Name</span>
          <div className="app-field-row__control">
            <input
              className="aero-field"
              value={name}
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitName()
              }}
            />
          </div>
        </div>

        <span className="aero-hint">
          <Info size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          Use variables anywhere in a request with{' '}
          <code className="aero-mono">{'{{name}}'}</code>. The five dynamic values{' '}
          <code className="aero-mono">$timestamp</code>, <code className="aero-mono">$isoTimestamp</code>,{' '}
          <code className="aero-mono">$uuid</code>, <code className="aero-mono">$randomInt</code> and{' '}
          <code className="aero-mono">$randomFloat</code> always work without being defined.
        </span>

        <KeyValueEditor
          rows={environment.variables}
          onChange={(rows) => updateEnvironmentRows(environment.id, rows)}
          keyPlaceholder="Variable"
          valuePlaceholder="Value"
          emptyHint="No variables yet — add one below."
        />
      </div>
    </Modal>
  )
}
