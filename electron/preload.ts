import { contextBridge, ipcRenderer } from 'electron'
import type { AeroApi, WindowState } from '../shared/bridge'
import type {
  AppSettings,
  HttpResponseData,
  HttpErrorData,
  OpenFileOptions,
  OpenFileResult,
  PersistedState,
  RequestConfig,
  SaveFileOptions,
  SaveFileResult
} from '../shared/types'

/** Shape of the API exposed to the renderer as `window.aero`. */
const api: AeroApi = {
  /** Execute an HTTP request from the main process (no CORS). */
  sendRequest: (
    config: RequestConfig,
    settings: AppSettings
  ): Promise<HttpResponseData | HttpErrorData> =>
    ipcRenderer.invoke('http:send', config, settings),

  /* ---------------- persistence ---------------- */
  loadState: (): Promise<PersistedState> => ipcRenderer.invoke('store:load'),
  saveState: (state: PersistedState): Promise<boolean> =>
    ipcRenderer.invoke('store:save', state),
  resetState: (): Promise<PersistedState> => ipcRenderer.invoke('store:reset'),
  getStorePath: (): Promise<string> => ipcRenderer.invoke('store:path'),
  revealStoreFile: (): Promise<boolean> => ipcRenderer.invoke('store:reveal'),

  /* ---------------- file dialogs ---------------- */
  saveFile: (options: SaveFileOptions): Promise<SaveFileResult> =>
    ipcRenderer.invoke('dialog:saveFile', options),
  openFile: (options?: OpenFileOptions): Promise<OpenFileResult> =>
    ipcRenderer.invoke('dialog:openFile', options),

  /* ---------------- window chrome ---------------- */
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onStateChange: (callback: (state: WindowState) => void): (() => void) => {
      const listener = (_event: unknown, state: WindowState): void => callback(state)
      ipcRenderer.on('window:state', listener)
      return () => ipcRenderer.removeListener('window:state', listener)
    }
  },

  /* ---------------- shell ---------------- */
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('aero', api)
