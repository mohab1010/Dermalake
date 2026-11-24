import { create } from 'zustand'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getAuthClient, isAdminEmail, isFirebaseConfigured } from '../lib/firebase'

interface AuthState {
  user: User | null
  // stays true until Firebase resolves the persisted session on page load
  loading: boolean
  // set when someone signs in with an account that isn't on the admin list
  rejected: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

let listenerAttached = false

export const useAuth = create<AuthState>(() => ({
  user: null,
  loading: isFirebaseConfigured,
  rejected: false,
  login: async (email, password) => {
    useAuth.setState({ rejected: false })
    await signInWithEmailAndPassword(getAuthClient(), email, password)
  },
  logout: async () => {
    await signOut(getAuthClient())
  },
}))

export function ensureAuthListener() {
  if (listenerAttached || !isFirebaseConfigured) return
  listenerAttached = true
  onAuthStateChanged(getAuthClient(), (user) => {
    // Security rules would reject every admin read for this account anyway —
    // sign it out instead of showing a dashboard full of errors.
    if (user && !isAdminEmail(user.email)) {
      useAuth.setState({ user: null, loading: false, rejected: true })
      void signOut(getAuthClient())
      return
    }
    useAuth.setState({ user, loading: false })
  })
}
