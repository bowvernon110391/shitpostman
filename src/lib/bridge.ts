import type { AeroApi } from '@shared/bridge'
import { DEFAULT_SETTINGS, type PersistedState } from '@shared/types'

/**
 * The preload script exposes `window.aero` via `contextBridge`. When the renderer
 * is loaded outside Electron (a plain browser pointed at the Vite dev server, or
 * an automated UI check) that bridge is absent. Rather than crashing on the first
 * `window.aero.*` call we install an inert stub so the whole UI still renders and
 * every action degrades into a readable message.
 */

const EMPTY_STATE: PersistedState = {
  collections: [],
  environments: [],
  activeEnvironmentId: null,
  history: [],
  settings: DEFAULT_SETTINGS
}

/** True when running inside the real Electron shell with a live preload bridge. */
function hasNativeBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.aero === 'object' && window.aero !== null
}

function createFallbackBridge(): AeroApi {
  return {
    async sendRequest() {
      return {
        error: 'Request engine unavailable.',
        code: 'NO_BRIDGE'
      }
    },
    async loadState() {
      return structuredClone(EMPTY_STATE)
    },
    async saveState() {
      return true
    },
    async resetState() {
      return structuredClone(EMPTY_STATE)
    },
    async getStorePath() {
      return 'not running in the desktop shell'
    },
    async revealStoreFile() {
      return false
    },
    async saveFile() {
      return { canceled: true }
    },
    async openFile() {
      return { canceled: true }
    },
    window: {
      async minimize() {},
      async toggleMaximize() {
        return false
      },
      async close() {},
      async isMaximized() {
        return false
      },
      onStateChange() {
        return () => {}
      }
    },
    async openExternal() {
      return false
    }
  }
}

/** Guarantees `window.aero` exists, installing a no-op stub when it does not. */
export function ensureBridge(): AeroApi {
  if (!hasNativeBridge()) {
    window.aero = createFallbackBridge()
  }
  return window.aero
}
