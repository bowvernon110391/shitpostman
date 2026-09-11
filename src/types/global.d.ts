import type { AeroApi } from '@shared/bridge'

declare global {
  interface Window {
    aero: AeroApi
  }
}

export {}
