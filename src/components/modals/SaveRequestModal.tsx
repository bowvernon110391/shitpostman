import { useMemo, useState } from 'react'
import { FolderPlus, Save } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { Modal } from '../ui/Modal'
import type { Collection, CollectionItem } from '@shared/types'

interface FolderOption {
  id: string
  name: string
  depth: number
}

function flattenFolders(items: CollectionItem[], depth = 0): FolderOption[] {
  const out: FolderOption[] = []
  for (const item of items) {
    if (item.type === 'folder') {
      out.push({ id: item.id, name: item.name, depth })
      out.push(...flattenFolders(item.items, depth + 1))
    }
  }
  return out
}

/** Prompts for a name + destination when saving the current draft. */
export function SaveRequestModal(): JSX.Element {
  const collections: Collection[] = useAppStore((state) => state.collections)
  const draftName = useAppStore((state) => state.draftName)
  const defaultId = useAppStore((state) => state.draftParentId)
  const saveDraftAs = useAppStore((state) => state.saveDraftAs)
  const addCollection = useAppStore((state) => state.addCollection)
  const notify = useAppStore((state) => state.notify)
  const closeModal = useUiStore((state) => state.closeModal)

  const [name, setName] = useState(draftName || 'New request')
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? '')
  const [parentId, setParentId] = useState<string>(defaultId ?? '')

  const folders = useMemo(
    () => collections.find((collection) => collection.id === collectionId)?.items ?? [],
    [collections, collectionId]
  )
  const folderOptions = useMemo(() => flattenFolders(folders), [folders])

  const submit = (): void => {
    let target = collectionId
    if (!target) {
      target = addCollection('My Collection')
    }
    saveDraftAs(name.trim() || 'New request', target, parentId || null)
    notify(`Saved “${name.trim() || 'New request'}”`, 'success')
    closeModal()
  }

  return (
    <Modal
      title="Save request"
      onClose={closeModal}
      footer={
        <>
          <span className="aero-modal__footer-spacer" />
          <button type="button" className="aero-button" onClick={closeModal}>
            Cancel
          </button>
          <button type="button" className="aero-button aero-button--primary" onClick={submit}>
            <Save size={13} />
            Save
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
              autoFocus
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
          </div>
        </div>

        <div className="app-field-row">
          <span className="app-field-row__label">Collection</span>
          <div className="app-field-row__control">
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: '1 1 auto' }}>
                <select
                  className="aero-select"
                  style={{ width: '100%' }}
                  value={collectionId}
                  onChange={(event) => {
                    setCollectionId(event.target.value)
                    setParentId('')
                  }}
                >
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                  {collections.length === 0 ? <option value="">(no collections yet)</option> : null}
                </select>
                <span className="aero-select__chevron" aria-hidden="true" />
              </div>
              <button
                type="button"
                className="aero-button aero-button--icon"
                title="Create a new collection"
                onClick={() => {
                  const id = addCollection('New collection')
                  setCollectionId(id)
                  setParentId('')
                }}
              >
                <FolderPlus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="app-field-row">
          <span className="app-field-row__label">Folder</span>
          <div className="app-field-row__control">
            <div style={{ position: 'relative' }}>
              <select
                className="aero-select"
                style={{ width: '100%' }}
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
              >
                <option value="">— top level —</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {'\u00A0'.repeat(folder.depth * 3)}
                    {folder.name}
                  </option>
                ))}
              </select>
              <span className="aero-select__chevron" aria-hidden="true" />
            </div>
          </div>
        </div>

        <span className="aero-hint">
          Saving stores the request inside your collection so you can replay it any time.
        </span>
      </div>
    </Modal>
  )
}
