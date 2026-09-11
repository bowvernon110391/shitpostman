import { useState } from 'react'
import { Check, Download, Globe, Pencil, Plus, Sliders, Trash2, Upload } from 'lucide-react'
import { isFilled, type Environment } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { exportEnvironment, importEnvironment } from '../../lib/postman'
import { exportToFile, importFromFile, JSON_FILTER } from '../../lib/fileIO'
import { SettingsButton } from '../ui/SettingsButton'

/** Sidebar panel listing saved environments. */
export function EnvironmentPanel(): JSX.Element {
  const environments = useAppStore((state) => state.environments)
  const activeEnvironmentId = useAppStore((state) => state.activeEnvironmentId)
  const setActiveEnvironment = useAppStore((state) => state.setActiveEnvironment)
  const addEnvironment = useAppStore((state) => state.addEnvironment)
  const renameEnvironment = useAppStore((state) => state.renameEnvironment)
  const deleteEnvironment = useAppStore((state) => state.deleteEnvironment)
  const notify = useAppStore((state) => state.notify)
  const openModal = useUiStore((state) => state.openModal)
  const askConfirm = useUiStore((state) => state.askConfirm)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const commitRename = (): void => {
    if (renamingId && renameValue.trim()) renameEnvironment(renamingId, renameValue.trim())
    setRenamingId(null)
  }

  const handleExport = async (environment: Environment): Promise<void> => {
    const content = exportEnvironment(environment.name, environment.variables)
    const result = await exportToFile({
      defaultPath: `${environment.name.replace(/\s+/g, '-').toLowerCase()}.environment.json`,
      content,
      filters: [JSON_FILTER]
    })
    if (result.saved) notify('Environment exported', 'success')
  }

  const handleImport = async (): Promise<void> => {
    const content = await importFromFile({ filters: [JSON_FILTER] })
    if (!content) return
    const environment = importEnvironment(content)
    if (!environment) {
      notify('That file is not a Postman environment', 'warning')
      return
    }
    const id = addEnvironment(environment.name)
    const created = useAppStore.getState().environments.find((item) => item.id === id)
    if (created) {
      useAppStore.getState().updateEnvironmentRows(id, environment.variables)
    }
    notify(`Imported environment “${environment.name}”`, 'success')
  }

  return (
    <>
      <div className="aero-tree aero-scroll">
        <div
          className={`aero-tree__row${activeEnvironmentId === null ? ' aero-tree__row--active' : ''}`}
          onClick={() => setActiveEnvironment(null)}
          role="treeitem"
        >
          <span className="aero-tree__twisty" style={{ visibility: 'hidden' }} />
          <span className="aero-tree__icon">
            <Globe size={13} className="aero-dim" />
          </span>
          <span className="aero-tree__label">No environment</span>
          {activeEnvironmentId === null ? (
            <div className="aero-tree__actions">
              <Check size={13} />
            </div>
          ) : null}
        </div>

        {environments.map((environment) => {
          const active = environment.id === activeEnvironmentId
          return (
            <div
              key={environment.id}
              className={`aero-tree__row${active ? ' aero-tree__row--active' : ''}`}
              onClick={() => setActiveEnvironment(environment.id)}
              onDoubleClick={() => openModal('environment', environment.id)}
              role="treeitem"
            >
              <span className="aero-tree__twisty" style={{ visibility: 'hidden' }} />
              <span className="aero-tree__icon">
                <Globe size={13} />
              </span>
              {renamingId === environment.id ? (
                <input
                  className="aero-inline-input"
                  value={renameValue}
                  autoFocus
                  spellCheck={false}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === 'Escape') commitRename()
                  }}
                />
              ) : (
                <span className="aero-tree__label" title={environment.name}>
                  {environment.name}
                  <span className="aero-dim">
                    {' '}
                    · {environment.variables.filter(isFilled).length}
                  </span>
                </span>
              )}
              <div className="aero-tree__actions">
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Edit variables"
                  onClick={(event) => {
                    event.stopPropagation()
                    openModal('environment', environment.id)
                  }}
                >
                  <Sliders size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Rename"
                  onClick={(event) => {
                    event.stopPropagation()
                    setRenamingId(environment.id)
                    setRenameValue(environment.name)
                  }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Export"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleExport(environment)
                  }}
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation()
                    askConfirm({
                      title: 'Delete environment',
                      message: `“${environment.name}” and its variables will be removed.`,
                      confirmLabel: 'Delete',
                      danger: true,
                      onConfirm: () => deleteEnvironment(environment.id)
                    })
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}

        {environments.length === 0 ? (
          <div className="app-kv__empty">
            <Globe size={12} /> No environments yet — variables like {'{{base_url}}'} need one.
          </div>
        ) : null}
      </div>

      <div className="app-sidebar__foot">
        <button
          type="button"
          className="aero-button aero-button--sm"
          onClick={() => {
            const id = addEnvironment('New environment')
            openModal('environment', id)
          }}
        >
          <Plus size={12} />
          New
        </button>
        <button
          type="button"
          className="aero-button aero-button--sm"
          onClick={() => void handleImport()}
        >
          <Upload size={12} />
          Import
        </button>
        <span className="app-sidebar__foot-spacer" />
        <SettingsButton />
      </div>
    </>
  )
}
