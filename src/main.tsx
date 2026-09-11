import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ensureBridge } from './lib/bridge'
import './styles/theme.css'
import './styles/aero.css'
import './styles/app.css'

/*
 * In production the renderer is locked down with a strict CSP. It is injected
 * here rather than hard-coded in index.html so that the Vite dev server (which
 * needs inline scripts for React Refresh and a websocket for HMR) still works.
 */
if (!import.meta.env.DEV) {
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ')
  document.head.appendChild(meta)
}

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root is missing from index.html')

// Make sure `window.aero` exists before anything renders. Inside Electron this is
// the preload bridge; anywhere else it is an inert stub, so the UI never blanks.
ensureBridge()

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
