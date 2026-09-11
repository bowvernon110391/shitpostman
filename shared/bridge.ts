import type {
  AppSettings,
  HttpErrorData,
  HttpResponseData,
  OpenFileOptions,
  OpenFileResult,
  PersistedState,
  RequestConfig,
  SaveFileOptions,
  SaveFileResult
} from './types'

export interface WindowState {
  maximized: boolean
  fullScreen: boolean
}

/**
 * The contract implemented by `electron/preload.ts` and consumed by the
 * renderer as `window.aero`. Kept in `shared/` so both sides type-check against
 * a single source of truth.
 */
export interface AeroApi {
  sendRequest(
    config: RequestConfig,
    settings: AppSettings
  ): Promise<HttpResponseData | HttpErrorData>

  loadState(): Promise<PersistedState>
  saveState(state: PersistedState): Promise<boolean>
  resetState(): Promise<PersistedState>
  getStorePath(): Promise<string>
  revealStoreFile(): Promise<boolean>

  saveFile(options: SaveFileOptions): Promise<SaveFileResult>
  openFile(options?: OpenFileOptions): Promise<OpenFileResult>

  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<boolean>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
    onStateChange(callback: (state: WindowState) => void): () => void
  }

  openExternal(url: string): Promise<boolean>
}
