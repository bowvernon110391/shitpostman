import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from 'react'
import {
  ChevronRight,
  Copy,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Folder,
  Layers,
  Pencil,
  Send,
  Trash2
} from 'lucide-react'
import type { Collection, CollectionItem } from '@shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { countRequests } from '../../lib/tree'

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

function filterNodes(items: CollectionItem[], term: string): CollectionItem[] {
  if (!term) return items
  const needle = term.toLowerCase()
  const out: CollectionItem[] = []

  for (const item of items) {
    if (item.type === 'folder') {
      const children = filterNodes(item.items, term)
      if (children.length || item.name.toLowerCase().includes(needle)) {
        out.push({ ...item, items: children })
      }
    } else if (
      item.name.toLowerCase().includes(needle) ||
      item.config.url.toLowerCase().includes(needle)
    ) {
      out.push(item)
    }
  }

  return out
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

interface RowProps {
  icon: JSX.Element
  label: string
  depth: number
  active?: boolean
  dropTarget?: boolean
  twisty?: 'none' | 'closed' | 'open'
  draggable?: boolean
  renaming?: boolean
  renameValue?: string
  onRenameChange?: (value: string) => void
  onRenameCommit?: () => void
  onClick: () => void
  onContextMenu: (event: MouseEvent) => void
  onDragStart?: (event: DragEvent) => void
  onDragOver?: (event: DragEvent) => void
  onDragLeave?: (event: DragEvent) => void
  onDrop?: (event: DragEvent) => void
  actions?: JSX.Element
}

function Row({
  icon,
  label,
  depth,
  active = false,
  dropTarget = false,
  twisty = 'none',
  draggable = false,
  renaming = false,
  renameValue = '',
  onRenameChange,
  onRenameCommit,
  onClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  actions
}: RowProps): JSX.Element {
  return (
    <div
      className={`aero-tree__row${active ? ' aero-tree__row--active' : ''}${
        dropTarget ? ' aero-tree__row--drop' : ''
      }`}
      style={{ paddingLeft: 4 + depth * 4 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={draggable && !renaming}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      role="treeitem"
      aria-selected={active}
    >
      {twisty === 'none' ? (
        <span className="aero-tree__twisty" style={{ visibility: 'hidden' }} />
      ) : (
        <span className={`aero-tree__twisty${twisty === 'open' ? ' aero-tree__twisty--open' : ''}`}>
          <ChevronRight size={12} />
        </span>
      )}

      <span className="aero-tree__icon">{icon}</span>

      {renaming ? (
        <input
          className="aero-inline-input"
          value={renameValue}
          autoFocus
          spellCheck={false}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onRenameChange?.(event.target.value)}
          onBlur={() => onRenameCommit?.()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onRenameCommit?.()
            if (event.key === 'Escape') onRenameCommit?.()
          }}
        />
      ) : (
        <span className="aero-tree__label" title={label}>
          {label}
        </span>
      )}

      {actions ? <div className="aero-tree__actions">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tree                                                                */
/* ------------------------------------------------------------------ */

interface TreeProps {
  filter: string
}

export function CollectionTree({ filter }: TreeProps): JSX.Element {
  const collections = useAppStore((state) => state.collections)
  const selectedNodeId = useAppStore((state) => state.selectedNodeId)
  const openRequest = useAppStore((state) => state.openRequest)
  const toggleCollapse = useAppStore((state) => state.toggleCollapse)
  const selectNode = useAppStore((state) => state.selectNode)
  const renameItem = useAppStore((state) => state.renameItem)
  const deleteItem = useAppStore((state) => state.deleteItem)
  const duplicateItem = useAppStore((state) => state.duplicateItem)
  const addFolder = useAppStore((state) => state.addFolder)
  const addRequest = useAppStore((state) => state.addRequest)
  const renameCollection = useAppStore((state) => state.renameCollection)
  const deleteCollection = useAppStore((state) => state.deleteCollection)
  const moveNode = useAppStore((state) => state.moveNode)
  const notify = useAppStore((state) => state.notify)
  const addCollection = useAppStore((state) => state.addCollection)

  const openMenu = useUiStore((state) => state.openMenu)
  const askConfirm = useUiStore((state) => state.askConfirm)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)

  // A rename started elsewhere should win, and cancelling clears the field.
  useEffect(() => {
    if (!renamingId) setRenameValue('')
  }, [renamingId])

  const visible = useMemo(
    () =>
      collections.map((collection) => ({
        ...collection,
        items: filterNodes(collection.items, filter.trim())
      })),
    [collections, filter]
  )

  const startRename = (id: string, current: string): void => {
    setRenamingId(id)
    setRenameValue(current)
  }

  const commitRename = (collectionId: string | null): void => {
    if (!renamingId) return
    const name = renameValue.trim()
    if (name) {
      if (collectionId) renameCollection(collectionId, name)
      else renameItem(renamingId, name)
    }
    setRenamingId(null)
  }

  const requestMenu = (
    event: MouseEvent,
    item: Extract<CollectionItem, { type: 'request' }>
  ): void => {
    event.preventDefault()
    event.stopPropagation()
    selectNode(item.id)

    openMenu(event.clientX, event.clientY, [
      { label: 'Open', icon: <Send size={13} />, onSelect: () => openRequest(item.id) },
      {
        label: 'Rename',
        icon: <Pencil size={13} />,
        onSelect: () => startRename(item.id, item.name)
      },
      {
        label: 'Duplicate',
        icon: <Copy size={13} />,
        onSelect: () => duplicateItem(item.id)
      },
      {
        label: 'Delete',
        icon: <Trash2 size={13} />,
        danger: true,
        separatorBefore: true,
        onSelect: () =>
          askConfirm({
            title: 'Delete request',
            message: `“${item.name}” will be permanently removed from this collection.`,
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => {
              deleteItem(item.id)
              notify(`Deleted “${item.name}”`, 'info')
            }
          })
      }
    ])
  }

  const folderMenu = (
    event: MouseEvent,
    item: Extract<CollectionItem, { type: 'folder' }>,
    collectionId: string
  ): void => {
    event.preventDefault()
    event.stopPropagation()
    selectNode(item.id)

    openMenu(event.clientX, event.clientY, [
      {
        label: 'New request',
        icon: <FilePlus2 size={13} />,
        onSelect: () => addRequest(collectionId, item.id, 'New request')
      },
      {
        label: 'New folder',
        icon: <FolderPlus size={13} />,
        onSelect: () => addFolder(collectionId, item.id, 'New folder')
      },
      {
        label: 'Rename',
        icon: <Pencil size={13} />,
        separatorBefore: true,
        onSelect: () => startRename(item.id, item.name)
      },
      {
        label: 'Duplicate',
        icon: <Copy size={13} />,
        onSelect: () => duplicateItem(item.id)
      },
      {
        label: 'Delete',
        icon: <Trash2 size={13} />,
        danger: true,
        separatorBefore: true,
        onSelect: () =>
          askConfirm({
            title: 'Delete folder',
            message: `“${item.name}” and everything inside it will be removed.`,
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => {
              deleteItem(item.id)
              notify(`Deleted “${item.name}”`, 'info')
            }
          })
      }
    ])
  }

  const collectionMenu = (event: MouseEvent, collection: Collection): void => {
    event.preventDefault()
    openMenu(event.clientX, event.clientY, [
      {
        label: 'New request',
        icon: <FilePlus2 size={13} />,
        onSelect: () => addRequest(collection.id, null, 'New request')
      },
      {
        label: 'New folder',
        icon: <FolderPlus size={13} />,
        onSelect: () => addFolder(collection.id, null, 'New folder')
      },
      {
        label: 'Rename collection',
        icon: <Pencil size={13} />,
        separatorBefore: true,
        onSelect: () => startRename(collection.id, collection.name)
      },
      {
        label: 'Delete collection',
        icon: <Trash2 size={13} />,
        danger: true,
        separatorBefore: true,
        onSelect: () =>
          askConfirm({
            title: 'Delete collection',
            message: `“${collection.name}” and all of its requests will be removed.`,
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => {
              deleteCollection(collection.id)
              notify(`Deleted “${collection.name}”`, 'info')
            }
          })
      }
    ])
  }

  const emptyMenu = (event: MouseEvent): void => {
    event.preventDefault()
    openMenu(event.clientX, event.clientY, [
      {
        label: 'New collection',
        icon: <Layers size={13} />,
        onSelect: () => {
          const id = addCollection('New collection')
          startRename(id, 'New collection')
        }
      }
    ])
  }

  /** Renders one node at any depth. */
  const renderNode = (item: CollectionItem, collection: Collection, depth: number): JSX.Element => {
    const isRenaming = renamingId === item.id

    if (item.type === 'folder') {
      const children = item.collapsed ? [] : item.items

      return (
        <div key={item.id}>
          <Row
            icon={<FolderOpen size={13} />}
            label={item.name}
            depth={depth}
            active={selectedNodeId === item.id}
            dropTarget={dropId === item.id}
            twisty={item.collapsed ? 'closed' : 'open'}
            draggable
            renaming={isRenaming}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameCommit={() => commitRename(null)}
            onClick={() => {
              selectNode(item.id)
              toggleCollapse(item.id)
            }}
            onContextMenu={(event) => folderMenu(event, item, collection.id)}
            onDragStart={(event) => {
              event.stopPropagation()
              setDragId(item.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setDropId(item.id)
            }}
            onDragLeave={() => setDropId((current) => (current === item.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setDropId(null)
              if (dragId && dragId !== item.id) moveNode(dragId, item.id)
              setDragId(null)
            }}
            actions={
              <>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="New request in folder"
                  onClick={(event) => {
                    event.stopPropagation()
                    addRequest(collection.id, item.id, 'New request')
                  }}
                >
                  <FilePlus2 size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="Delete folder"
                  onClick={(event) => {
                    event.stopPropagation()
                    askConfirm({
                      title: 'Delete folder',
                      message: `“${item.name}” and everything inside it will be removed.`,
                      confirmLabel: 'Delete',
                      danger: true,
                      onConfirm: () => deleteItem(item.id)
                    })
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </>
            }
          />

          {children.length > 0 ? (
            <div className="aero-tree__children">
              {children.map((child) => renderNode(child, collection, depth + 1))}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <Row
        key={item.id}
        icon={<Send size={12} className="aero-dim" />}
        label={item.name}
        depth={depth}
        active={selectedNodeId === item.id}
        draggable
        renaming={isRenaming}
        renameValue={renameValue}
        onRenameChange={setRenameValue}
        onRenameCommit={() => commitRename(null)}
        onClick={() => openRequest(item.id)}
        onContextMenu={(event) => requestMenu(event, item)}
        onDragStart={(event) => {
          event.stopPropagation()
          setDragId(item.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
      />
    )
  }

  if (collections.length === 0) {
    return (
      <div className="aero-tree aero-scroll" onContextMenu={emptyMenu}>
        <div className="app-placeholder" style={{ height: 'auto', paddingTop: 40 }}>
          <Layers size={30} className="aero-dim" />
          <span className="app-placeholder__title">No collections yet</span>
          <span className="app-placeholder__hint">
            Create a collection to start organising your API calls.
          </span>
          <button
            type="button"
            className="aero-button aero-button--primary"
            onClick={() => addCollection('New collection')}
          >
            <FolderPlus size={13} />
            New collection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="aero-tree aero-scroll" onContextMenu={emptyMenu} role="tree">
      {visible.map((collection) => (
        <div key={collection.id}>
          <Row
            icon={<Layers size={13} />}
            label={`${collection.name} (${countRequests(collection.items)})`}
            depth={0}
            dropTarget={dropId === collection.id}
            active={false}
            twisty={collection.collapsed ? 'closed' : 'open'}
            renaming={renamingId === collection.id}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameCommit={() => commitRename(collection.id)}
            onClick={() => toggleCollapse(collection.id)}
            onContextMenu={(event) => collectionMenu(event, collection)}
            onDragOver={(event) => {
              event.preventDefault()
              setDropId(collection.id)
            }}
            onDragLeave={() => setDropId((current) => (current === collection.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              setDropId(null)
              if (dragId) moveNode(dragId, null)
              setDragId(null)
            }}
            actions={
              <>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="New request"
                  onClick={(event) => {
                    event.stopPropagation()
                    addRequest(collection.id, null, 'New request')
                  }}
                >
                  <FilePlus2 size={12} />
                </button>
                <button
                  type="button"
                  className="aero-button aero-button--icon aero-button--ghost"
                  title="New folder"
                  onClick={(event) => {
                    event.stopPropagation()
                    addFolder(collection.id, null, 'New folder')
                  }}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            }
          />

          {!collection.collapsed && collection.items.length > 0 ? (
            <div className="aero-tree__children">
              {collection.items.map((item) => renderNode(item, collection, 1))}
            </div>
          ) : null}

          {!collection.collapsed && filter.trim() && collection.items.length === 0 ? (
            <div className="aero-tree__children">
              <div className="app-kv__empty" style={{ paddingLeft: 10 }}>
                <Folder size={12} /> No matches
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
