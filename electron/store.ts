import Store from 'electron-store'
import type { PersistedState } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

interface StoreShape {
  state: PersistedState
}

const store = new Store<StoreShape>({
  name: 'shitpostman',
  defaults: {
    state: {
      collections: [],
      environments: [],
      activeEnvironmentId: null,
      history: [],
      settings: { ...DEFAULT_SETTINGS }
    }
  }
})

/** Read the whole persisted state, healing missing/extra fields. */
export function loadState(): PersistedState {
  const state = store.get('state')
  return {
    collections: state.collections ?? [],
    environments: state.environments ?? [],
    activeEnvironmentId: state.activeEnvironmentId ?? null,
    history: state.history ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) }
  }
}

/** Persist the whole state. */
export function saveState(state: PersistedState): void {
  store.set('state', state)
}

/** Wipe everything back to defaults. */
export function resetState(): PersistedState {
  store.clear()
  return loadState()
}

/** Absolute path of the backing JSON file, for "Reveal data file". */
export function getStorePath(): string {
  return store.path
}
