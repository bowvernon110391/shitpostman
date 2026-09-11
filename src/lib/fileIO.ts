import type { OpenFileOptions, SaveFileOptions } from '@shared/types'

export interface ExportResult {
  saved: boolean
  filePath?: string
}

/** Show a save dialog and write the content via the main process. */
export async function exportToFile(options: SaveFileOptions): Promise<ExportResult> {
  const result = await window.aero.saveFile(options)
  if (result.canceled) return { saved: false }
  return { saved: true, filePath: result.filePath }
}

/** Show an open dialog and read the file contents via the main process. */
export async function importFromFile(options?: OpenFileOptions): Promise<string | null> {
  const result = await window.aero.openFile(options)
  if (result.canceled || result.content === undefined) return null
  return result.content
}

export const JSON_FILTER = { name: 'JSON', extensions: ['json'] }
export const ALL_FILTER = { name: 'All files', extensions: ['*'] }
