import { useState } from 'react'
import { Clock, Download, FolderPlus, Globe, Layers, Search, Settings, Upload, X } from 'lucide-react'
import { useAppStore, type SidebarTab } from '../../store/useAppStore'
import { useUiStore } from '../../store/useUiStore'
import { CollectionTree } from './CollectionTree'
import { EnvironmentPanel } from '../environments/EnvironmentPanel'
import { HistoryPanel } from '../history/HistoryPanel'
import { exportAllCollections, importPostmanCollection } from '../../lib/postman'
import { importFromFile, exportToFile, JSON_FILTER } from '../../lib/fileIO'

const TABS: { id: SidebarTab; label: string; icon: JSX.Element }[] = [
  { id: 'collections', label: 'Collections', icon: <Layers size={12} /> },
  { id: 'environments', label: 'Environments', icon: <Globe size={12} /> },
  { id: 'history', label: 'History', icon: <Clock size={12} /> }
]

/** Left rail: collections tree, environments, and request history. */
export function CollectionSidebar(): JSX.Element {
  const sidebarTab = useAppStore((state) => state.sidebarTab)
  const setSidebarTab = useAppStore((state) => state.setSidebarTab)
  const collections = useAppStore((state) => state.collections)
  const history = useAppStore((state) => state.history)
  const importCollections = useAppStore((state) => state.importCollections)
  const addCollection = useAppStore((state) => state.addCollection)
  const notify = useAppStore((state) => state.notify)
  const openModal = useUiStore((state) => state.openModal)

  const [filter, setFilter] = useState('')

  const handleImport = async (): Promise<void> => {
    const content = await importFromFile({ filters: [JSON_FILTER] })
    if (!content) return

    const result = importPostmanCollection(content)
    if (result.collections.length) {
      importCollections(result.collections)
      notify(
        `Imported ${result.collections.length} collection${
          result.collections.length === 1 ? '' : 's'
        }`,
        'success'
      )
      setSidebarTab('collections')
    }
    for (const error of result.errors) notify(error, 'warning')
  }

  const handleExportAll = async (): Promise<void> => {
    if (!collections.length) {
      notify('There is nothing to export yet', 'warning')
      return
    }
    const content = exportAllCollections(collections)
    const result = await exportToFile({
      defaultPath: 'shitpostman-collections.json',
      content,
      filters: [JSON_FILTER]
    })
    if (result.saved) notify('Collections exported', 'success')
  }

  return (
    <aside className="aero-sidebar">
      <div className="aero-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`aero-tab${sidebarTab === tab.id ? ' aero-tab--active' : ''}`}
            onClick={() => setSidebarTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'history' && history.length ? (
              <span className="aero-tab__count">{history.length > 99 ? '99+' : history.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {sidebarTab === 'collections' ? (
        <div className="app-sidebar__search">
          <div className="app-search">
            <Search className="app-search__icon" size={13} />
            <input
              className="aero-field aero-field--mono app-search__input"
              placeholder="Search collections…"
              value={filter}
              spellCheck={false}
              onChange={(event) => setFilter(event.target.value)}
            />
            {filter ? (
              <button
                type="button"
                className="aero-button aero-button--icon aero-button--ghost"
                style={{ position: 'absolute', right: 5, top: 4 }}
                onClick={() => setFilter('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {sidebarTab === 'collections' ? <CollectionTree filter={filter} /> : null}
      {sidebarTab === 'environments' ? <EnvironmentPanel /> : null}
      {sidebarTab === 'history' ? <HistoryPanel /> : null}

      <div className="app-sidebar__foot">
        <button
          type="button"
          className="aero-button aero-button--sm"
          onClick={() => addCollection('New collection')}
          title="New collection"
        >
          <FolderPlus size={12} />
          New
        </button>
        <button
          type="button"
          className="aero-button aero-button--sm"
          onClick={() => void handleImport()}
          title="Import a Postman collection"
        >
          <Upload size={12} />
          Import
        </button>
        <span className="app-sidebar__foot-spacer" />
        <button
          type="button"
          className="aero-button aero-button--icon aero-button--ghost"
          onClick={() => void handleExportAll()}
          title="Export all collections"
        >
          <Download size={13} />
        </button>
        <button
          type="button"
          className="aero-button aero-button--icon aero-button--ghost"
          onClick={() => openModal('settings')}
          title="Settings"
        >
          <Settings size={13} />
        </button>
      </div>
    </aside>
  )
}
