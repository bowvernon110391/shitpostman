/// <reference types="vite/client" />

/**
 * The app version, injected by `electron.vite.config.ts` from package.json at
 * build time. Declared globally so the renderer can report it without having to
 * import JSON at runtime.
 */
declare const __APP_VERSION__: string
