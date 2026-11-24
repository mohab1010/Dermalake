import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Must stay in sync with isAdmin() in firebase/firestore.rules and firebase/storage.rules. */
export const ADMIN_EMAILS = ['ferashatem02@gmail.com', 'ibrahim@gmail.com']

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
let firestore: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured — check your .env.local')
  }
  if (!app) app = initializeApp(config)
  return app
}

export function getDb(): Firestore {
  if (!firestore) firestore = getFirestore(getApp())
  return firestore
}

export function getAuthClient(): Auth {
  if (!auth) auth = getAuth(getApp())
  return auth
}

export function getStorageClient(): FirebaseStorage {
  if (!storage) storage = getStorage(getApp())
  return storage
}
