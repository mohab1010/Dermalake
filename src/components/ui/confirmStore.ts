import { create } from 'zustand'

export interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

export const useConfirmStore = create<ConfirmState>(() => ({
  open: false,
  message: '',
  resolve: null,
}))

/** Promise-based replacement for window.confirm(), styled to match the app. */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts = typeof options === 'string' ? { message: options } : options
  return new Promise((resolve) => {
    useConfirmStore.setState({ ...opts, open: true, resolve })
  })
}
