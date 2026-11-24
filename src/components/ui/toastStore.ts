import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string) => void
}

let hideTimer: ReturnType<typeof setTimeout> | undefined

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message })
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => set({ message: null }), 2500)
  },
}))
