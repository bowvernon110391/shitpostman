import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { sendRequest } from './httpClient'
import { getStorePath, loadState, resetState, saveState } from './store'
import type {
  AppSettings,
  OpenFileOptions,
  OpenFileResult,
  PersistedState,
  RequestConfig,
  SaveFileOptions,
  SaveFileResult
} from '../shared/types'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    roundedCorners: true,
    // Matches the Aero sky background so there is no white flash on launch.
    backgroundColor: '#0a4571',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  const emitWindowState = (): void => {
    if (!mainWindow) return
    mainWindow.webContents.send('window:state', {
      maximized: mainWindow.isMaximized(),
      fullScreen: mainWindow.isFullScreen()
    })
  }

  mainWindow.on('maximize', emitWindowState)
  mainWindow.on('unmaximize', emitWindowState)
  mainWindow.on('enter-full-screen', emitWindowState)
  mainWindow.on('leave-full-screen', emitWindowState)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Any target=_blank / window.open goes to the system browser, never a new
  // Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function focusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? mainWindow
}

/* ------------------------------------------------------------------ */
/* IPC: HTTP                                                           */
/* ------------------------------------------------------------------ */

ipcMain.handle(
  'http:send',
  async (_event, config: RequestConfig, settings: AppSettings) => {
    return sendRequest(config, settings)
  }
)

/* ------------------------------------------------------------------ */
/* IPC: persistence                                                    */
/* ------------------------------------------------------------------ */

ipcMain.handle('store:load', () => loadState())

ipcMain.handle('store:save', (_event, state: PersistedState) => {
  saveState(state)
  return true
})

ipcMain.handle('store:reset', () => resetState())

ipcMain.handle('store:path', () => getStorePath())

ipcMain.handle('store:reveal', () => {
  void shell.showItemInFolder(getStorePath())
  return true
})

/* ------------------------------------------------------------------ */
/* IPC: file dialogs                                                   */
/* ------------------------------------------------------------------ */

ipcMain.handle(
  'dialog:saveFile',
  async (_event, options: SaveFileOptions): Promise<SaveFileResult> => {
    const win = focusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: options.defaultPath,
      filters: options.filters
    })

    if (result.canceled || !result.filePath) return { canceled: true }

    try {
      const encoding = options.encoding === 'base64' ? 'base64' : 'utf8'
      await fs.writeFile(result.filePath, options.content, { encoding })
      return { canceled: false, filePath: result.filePath }
    } catch (error) {
      return {
        canceled: false,
        filePath: `ERROR: ${(error as Error).message}`
      }
    }
  }
)

ipcMain.handle(
  'dialog:openFile',
  async (_event, options: OpenFileOptions = {}): Promise<OpenFileResult> => {
    const win = focusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: options.filters
    })

    if (result.canceled || result.filePaths.length === 0) return { canceled: true }

    const filePath = result.filePaths[0]
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return { canceled: false, filePath, content }
    } catch (error) {
      return { canceled: false, filePath, content: `ERROR: ${(error as Error).message}` }
    }
  }
)

/* ------------------------------------------------------------------ */
/* IPC: window controls & shell                                        */
/* ------------------------------------------------------------------ */

ipcMain.handle('window:minimize', () => {
  focusedWindow()?.minimize()
})

ipcMain.handle('window:toggleMaximize', () => {
  const win = focusedWindow()
  if (!win) return false
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
  return win.isMaximized()
})

ipcMain.handle('window:close', () => {
  focusedWindow()?.close()
})

ipcMain.handle('window:isMaximized', () => focusedWindow()?.isMaximized() ?? false)

ipcMain.handle('shell:openExternal', (_event, url: string) => {
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url)
  return false
})

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

// No native menu — the app draws its own Aero chrome.
Menu.setApplicationMenu(null)

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = focusedWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  void app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
