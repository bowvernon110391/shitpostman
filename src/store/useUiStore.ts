import { create } from 'zustand'
import type { MenuItem } from '../components/ui/ContextMenu'

export type ModalKind =
  | 'saveRequest'
  | 'settings'
  | 'environment'
  | 'import'
  | 'about'
  | null

export interface ConfirmPayload {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

interface OpenMenuState {
  x: number
  y: number
  items: MenuItem[]
}

interface UiState {
  modal: ModalKind
  modalPayload: string | null
  confirm: ConfirmPayload | null
  menu: OpenMenuState | null

  openModal: (kind: Exclude<ModalKind, null>, payload?: string | null) => void
  closeModal: () => void

  askConfirm: (payload: ConfirmPayload) => void
  closeConfirm: () => void

  openMenu: (x: number, y: number, items: MenuItem[]) => void
  closeMenu: () => void
}

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  modalPayload: null,
  confirm: null,
  menu: null,

  openModal: (kind, payload = null) => set({ modal: kind, modalPayload: payload }),
  closeModal: () => set({ modal: null, modalPayload: null }),

  askConfirm: (payload) => set({ confirm: payload }),
  closeConfirm: () => set({ confirm: null }),

  openMenu: (x, y, items) => set({ menu: { x, y, items } }),
  closeMenu: () => set({ menu: null })
}))
