import { create } from 'zustand'
import type {
  AppSettings,
  Collection,
  CollectionItem,
  Environment,
  HistoryEntry,
  HttpErrorData,
  HttpResponseData,
  KeyValue,
  PersistedState,
  RequestConfig
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { cloneItem, cloneRequest, emptyRequest, seedCollections } from '../lib/defaults'
import { createId } from '../lib/ids'
import { collectRequests, findItem, insertItem, locateItem, removeItem, updateItem } from '../lib/tree'
import { resolveRequest, rowsToMap, type VariableMap } from '../lib/variables'

export type SidebarTab = 'collections' | 'environments' | 'history'
export type RequestTab = 'params' | 'headers' | 'body' | 'auth' | 'code'
export type ResponseTab = 'body' | 'headers' | 'cookies'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'info' | 'warning' | 'danger'
}

export interface TreeNode {
  item: CollectionItem
  depth: number
}

interface AppState {
  /* ---------------- persisted domain ---------------- */
  collections: Collection[]
  environments: Environment[]
  activeEnvironmentId: string | null
  history: HistoryEntry[]
  settings: AppSettings

  /* ---------------- transient UI ---------------- */
  hydrated: boolean
  sidebarTab: SidebarTab
  requestTab: RequestTab
  responseTab: ResponseTab
  selectedNodeId: string | null

  draft: RequestConfig
  draftName: string
  draftOriginId: string | null
  draftParentId: string | null

  response: HttpResponseData | null
  responseError: HttpErrorData | null
  sending: boolean

  toasts: Toast[]

  /* ---------------- lifecycle ---------------- */
  hydrate: () => Promise<void>
  resetAll: () => Promise<void>

  /* ---------------- ui ---------------- */
  setSidebarTab: (tab: SidebarTab) => void
  setRequestTab: (tab: RequestTab) => void
  setResponseTab: (tab: ResponseTab) => void
  selectNode: (id: string | null) => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void

  /* ---------------- request draft ---------------- */
  newRequest: () => void
  openRequest: (id: string) => void
  patchDraft: (patch: Partial<RequestConfig>) => void
  setDraftName: (name: string) => void
  saveDraftAs: (name: string, collectionId: string, parentId: string | null) => void
  updateSavedRequest: () => void

  /* ---------------- send ---------------- */
  send: () => Promise<void>
  clearResponse: () => void

  /* ---------------- collections ---------------- */
  addCollection: (name: string) => string
  renameCollection: (id: string, name: string) => void
  deleteCollection: (id: string) => void
  addFolder: (collectionId: string, parentId: string | null, name: string) => void
  addRequest: (collectionId: string, parentId: string | null, name: string) => void
  renameItem: (id: string, name: string) => void
  deleteItem: (id: string) => void
  duplicateItem: (id: string) => void
  toggleCollapse: (id: string) => void
  moveNode: (id: string, targetParentId: string | null) => void
  importCollections: (collections: Collection[]) => void

  /* ---------------- environments ---------------- */
  setActiveEnvironment: (id: string | null) => void
  addEnvironment: (name: string) => string
  renameEnvironment: (id: string, name: string) => void
  deleteEnvironment: (id: string) => void
  updateEnvironmentRows: (id: string, rows: KeyValue[]) => void

  /* ---------------- history ---------------- */
  deleteHistoryEntry: (id: string) => void
  clearHistory: () => void
  restoreHistory: (id: string) => void

  /* ---------------- settings ---------------- */
  updateSettings: (patch: Partial<AppSettings>) => void

  /* ---------------- derived ---------------- */
  activeVariables: () => VariableMap
  resolvedDraft: () => RequestConfig
}

/* ------------------------------------------------------------------ */
/* Persistence (debounced)                                             */
/* ------------------------------------------------------------------ */

let persistTimer: ReturnType<typeof setTimeout> | null = null

function snapshot(state: AppState): PersistedState {
  return {
    collections: state.collections,
    environments: state.environments,
    activeEnvironmentId: state.activeEnvironmentId,
    history: state.history,
    settings: state.settings
  }
}

/** Coalesce bursts of edits into a single disk write. */
function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    const state = useAppStore.getState()
    void window.aero.saveState(snapshot(state))
  }, 400)
}

/* ------------------------------------------------------------------ */
/* Seed helpers                                                        */
/* ------------------------------------------------------------------ */

function seedEnvironments(): Environment[] {
  return [
    {
      id: createId('env_'),
      name: 'Local sandbox',
      variables: [
        { id: createId('kv_'), key: 'base_url', value: 'https://httpbin.org', enabled: true },
        { id: createId('kv_'), key: 'api_token', value: 's3cr3t-aero-token', enabled: true },
        { id: createId('kv_'), key: 'username', value: 'meadow', enabled: true },
        { id: createId('kv_'), key: 'password', value: 'fish', enabled: true }
      ]
    }
  ]
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

export const useAppStore = create<AppState>((set, get) => ({
  collections: [],
  environments: [],
  activeEnvironmentId: null,
  history: [],
  settings: DEFAULT_SETTINGS,

  hydrated: false,
  sidebarTab: 'collections',
  requestTab: 'params',
  responseTab: 'body',
  selectedNodeId: null,

  draft: emptyRequest(),
  draftName: 'Untitled request',
  draftOriginId: null,
  draftParentId: null,

  response: null,
  responseError: null,
  sending: false,

  toasts: [],

  /* ------------------------- lifecycle ------------------------- */

  hydrate: async () => {
    const loaded = await window.aero.loadState()

    const firstRun = loaded.collections.length === 0
    const collections = firstRun ? seedCollections() : loaded.collections
    const environments = loaded.environments.length ? loaded.environments : seedEnvironments()
    const activeEnvironmentId =
      loaded.activeEnvironmentId && environments.some((e) => e.id === loaded.activeEnvironmentId)
        ? loaded.activeEnvironmentId
        : (environments[0]?.id ?? null)

    const first = collectRequests(collections.flatMap((c) => c.items))[0] ?? null

    set({
      collections,
      environments,
      activeEnvironmentId,
      history: loaded.history,
      settings: loaded.settings ?? DEFAULT_SETTINGS,
      hydrated: true,
      draft: first ? cloneRequest(first.config) : emptyRequest(),
      draftName: first?.name ?? 'Untitled request',
      draftOriginId: first?.id ?? null,
      draftParentId: null,
      selectedNodeId: first?.id ?? null
    })

    if (firstRun) schedulePersist()
  },

  resetAll: async () => {
    const fresh = await window.aero.resetState()
    set({
      collections: fresh.collections,
      environments: fresh.environments,
      activeEnvironmentId: fresh.activeEnvironmentId,
      history: fresh.history,
      settings: fresh.settings,
      selectedNodeId: null,
      draft: emptyRequest(),
      draftName: 'Untitled request',
      draftOriginId: null,
      response: null,
      responseError: null
    })
    get().notify('Workspace reset', 'info')
  },

  /* ---------------------------- ui ---------------------------- */

  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setRequestTab: (requestTab) => set({ requestTab }),
  setResponseTab: (responseTab) => set({ responseTab }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  notify: (message, tone = 'info') => {
    const toast: Toast = { id: createId('toast_'), message, tone }
    set((state) => ({ toasts: [...state.toasts, toast] }))
    setTimeout(() => get().dismissToast(toast.id), 3200)
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  /* ------------------------ request draft ---------------------- */

  newRequest: () =>
    set({
      draft: emptyRequest(),
      draftName: 'Untitled request',
      draftOriginId: null,
      draftParentId: null,
      selectedNodeId: null,
      response: null,
      responseError: null,
      requestTab: 'params'
    }),

  openRequest: (id) => {
    const { collections } = get()
    const item = findItem(collections.flatMap((c) => c.items), id)
    if (!item || item.type !== 'request') return

    set({
      draft: cloneRequest(item.config),
      draftName: item.name,
      draftOriginId: item.id,
      draftParentId: null,
      selectedNodeId: item.id,
      response: null,
      responseError: null
    })
  },

  patchDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),

  setDraftName: (draftName) => set({ draftName }),

  saveDraftAs: (name, collectionId, parentId) => {
    const { draft } = get()
    const node: CollectionItem = {
      id: createId('req_'),
      type: 'request',
      name,
      config: cloneRequest(draft)
    }

    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, items: insertItem(collection.items, parentId, node) }
          : collection
      ),
      draftName: name,
      draftOriginId: node.id,
      selectedNodeId: node.id
    }))

    schedulePersist()
    get().notify(`Saved “${name}”`, 'success')
  },

  updateSavedRequest: () => {
    const { draftOriginId, draft, draftName, collections } = get()
    if (!draftOriginId) {
      get().notify('Use “Save as” to place this request in a collection', 'warning')
      return
    }

    const exists = findItem(collections.flatMap((c) => c.items), draftOriginId)
    if (!exists) {
      get().notify('The original request no longer exists', 'warning')
      return
    }

    set((state) => ({
      collections: state.collections.map((collection) => ({
        ...collection,
        items: updateItem(collection.items, draftOriginId, (item) =>
          item.type === 'request'
            ? { ...item, name: draftName, config: cloneRequest(draft) }
            : item
        )
      }))
    }))

    schedulePersist()
    get().notify('Request updated', 'success')
  },

  /* ---------------------------- send --------------------------- */

  send: async () => {
    const state = get()
    const resolved = resolveRequest(state.draft, state.activeVariables())

    if (!resolved.url.trim()) {
      state.notify('Enter a URL before sending', 'warning')
      return
    }

    set({ sending: true, response: null, responseError: null })

    const started = Date.now()
    const result = await window.aero.sendRequest(resolved, state.settings)
    const elapsed = Date.now() - started

    const isError = 'error' in result

    const entry: HistoryEntry = {
      id: createId('hist_'),
      timestamp: Date.now(),
      method: resolved.method,
      url: resolved.url,
      status: isError ? undefined : (result as HttpResponseData).status,
      time: isError ? elapsed : (result as HttpResponseData).time,
      config: cloneRequest(resolved)
    }

    set((prev) => ({
      sending: false,
      response: isError ? null : (result as HttpResponseData),
      responseError: isError ? (result as HttpErrorData) : null,
      responseTab: 'body',
      history: [entry, ...prev.history].slice(0, Math.max(10, prev.settings.maxHistory))
    }))

    schedulePersist()

    if (isError) {
      get().notify((result as HttpErrorData).error, 'danger')
    }
  },

  clearResponse: () => set({ response: null, responseError: null }),

  /* ------------------------ collections ------------------------ */

  addCollection: (name) => {
    const collection: Collection = {
      id: createId('col_'),
      name,
      items: []
    }
    set((state) => ({ collections: [...state.collections, collection] }))
    schedulePersist()
    return collection.id
  },

  renameCollection: (id, name) => {
    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === id ? { ...collection, name } : collection
      )
    }))
    schedulePersist()
  },

  deleteCollection: (id) => {
    set((state) => ({ collections: state.collections.filter((c) => c.id !== id) }))
    schedulePersist()
  },

  addFolder: (collectionId, parentId, name) => {
    const node: CollectionItem = {
      id: createId('fld_'),
      type: 'folder',
      name,
      collapsed: false,
      items: []
    }
    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, items: insertItem(collection.items, parentId, node) }
          : collection
      ),
      selectedNodeId: node.id
    }))
    schedulePersist()
  },

  addRequest: (collectionId, parentId, name) => {
    const node: CollectionItem = {
      id: createId('req_'),
      type: 'request',
      name,
      config: emptyRequest()
    }
    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, items: insertItem(collection.items, parentId, node) }
          : collection
      ),
      selectedNodeId: node.id
    }))
    schedulePersist()
  },

  renameItem: (id, name) => {
    set((state) => ({
      collections: state.collections.map((collection) => ({
        ...collection,
        items: updateItem(collection.items, id, (item) => ({ ...item, name }))
      })),
      draftName: state.draftOriginId === id ? name : state.draftName
    }))
    schedulePersist()
  },

  deleteItem: (id) => {
    set((state) => ({
      collections: state.collections.map((collection) => ({
        ...collection,
        items: removeItem(collection.items, id)
      })),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }))
    schedulePersist()
  },

  duplicateItem: (id) => {
    const { collections } = get()
    const all = collections.flatMap((c) => c.items)
    const node = findItem(all, id)
    if (!node) return

    const location = locateItem(collections, id)
    if (!location) return

    const copy = cloneItem(node)
    copy.name = `${node.name} copy`

    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === location.collectionId
          ? { ...collection, items: insertItem(collection.items, location.parentId, copy) }
          : collection
      )
    }))
    schedulePersist()
  },

  toggleCollapse: (id) => {
    set((state) => ({
      collections: state.collections.map((collection) => {
        if (collection.id === id) return { ...collection, collapsed: !collection.collapsed }
        return {
          ...collection,
          items: updateItem(collection.items, id, (item) =>
            item.type === 'folder' ? { ...item, collapsed: !item.collapsed } : item
          )
        }
      })
    }))
    schedulePersist()
  },

  moveNode: (id, targetParentId) => {
    const { collections } = get()
    const location = locateItem(collections, id)
    if (!location || targetParentId === location.parentId) return

    const node = findItem(collections.flatMap((c) => c.items), id)
    if (!node) return

    const sameCollection = targetParentId === null || !!findItem(collections.flatMap((c) => c.items), targetParentId)
    if (!sameCollection) return

    const targetLocation = targetParentId ? locateItem(collections, targetParentId) : null
    const targetCollectionId = targetLocation?.collectionId ?? location.collectionId
    if (targetCollectionId !== location.collectionId) return

    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === location.collectionId
          ? { ...collection, items: insertItem(removeItem(collection.items, id), targetParentId, node) }
          : collection
      )
    }))
    schedulePersist()
  },

  importCollections: (incoming) => {
    set((state) => ({ collections: [...state.collections, ...incoming] }))
    schedulePersist()
  },

  /* ------------------------ environments ----------------------- */

  setActiveEnvironment: (activeEnvironmentId) => {
    set({ activeEnvironmentId })
    schedulePersist()
  },

  addEnvironment: (name) => {
    const env: Environment = { id: createId('env_'), name, variables: [] }
    set((state) => ({ environments: [...state.environments, env] }))
    schedulePersist()
    return env.id
  },

  renameEnvironment: (id, name) => {
    set((state) => ({
      environments: state.environments.map((env) => (env.id === id ? { ...env, name } : env))
    }))
    schedulePersist()
  },

  deleteEnvironment: (id) => {
    set((state) => ({
      environments: state.environments.filter((env) => env.id !== id),
      activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId
    }))
    schedulePersist()
  },

  updateEnvironmentRows: (id, rows) => {
    set((state) => ({
      environments: state.environments.map((env) =>
        env.id === id ? { ...env, variables: rows } : env
      )
    }))
    schedulePersist()
  },

  /* --------------------------- history ------------------------- */

  deleteHistoryEntry: (id) => {
    set((state) => ({ history: state.history.filter((entry) => entry.id !== id) }))
    schedulePersist()
  },

  clearHistory: () => {
    set({ history: [] })
    schedulePersist()
  },

  restoreHistory: (id) => {
    const entry = get().history.find((item) => item.id === id)
    if (!entry) return
    set({
      draft: cloneRequest(entry.config),
      draftName: `${entry.method} ${entry.url}`,
      draftOriginId: null,
      requestTab: 'params'
    })
  },

  /* --------------------------- settings ------------------------ */

  updateSettings: (patch) => {
    set((state) => ({ settings: { ...state.settings, ...patch } }))
    schedulePersist()
  },

  /* --------------------------- derived ------------------------- */

  activeVariables: () => {
    const { environments, activeEnvironmentId } = get()
    const env = environments.find((item) => item.id === activeEnvironmentId)
    return env ? rowsToMap(env.variables) : {}
  },

  resolvedDraft: () => resolveRequest(get().draft, get().activeVariables())
}))
