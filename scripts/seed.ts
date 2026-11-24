/**
 * Seeds Firestore with the Dermalake catalog (products + reviews).
 *
 * Usage:
 *   1. Create your Firebase project and a Firestore database (start in TEST MODE)
 *   2. Fill .env.local with your VITE_FIREBASE_* values
 *   3. npm run seed
 *   4. Paste firebase/firestore.rules into Firestore → Rules (production rules)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { doc, getFirestore, setDoc } from 'firebase/firestore'
import { SEED_PRODUCTS, SEED_REVIEWS } from '../src/data/products'
import { DEFAULT_CATEGORIES } from '../src/lib/types'

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

async function main() {
  const env = loadEnv()
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) {
    console.error('Missing VITE_FIREBASE_* values in .env.local — fill them in first.')
    process.exit(1)
  }

  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const db = getFirestore(app)

  console.log(`Seeding ${DEFAULT_CATEGORIES.length} categories...`)
  for (const { id, ...category } of DEFAULT_CATEGORIES) {
    await setDoc(doc(db, 'categories', id), category)
    console.log(`  ✓ ${category.slug}`)
  }

  console.log(`Seeding ${SEED_PRODUCTS.length} products...`)
  for (const { id, ...product } of SEED_PRODUCTS) {
    await setDoc(doc(db, 'products', id), product)
    console.log(`  ✓ ${product.slug}`)
  }

  console.log(`Seeding ${SEED_REVIEWS.length} reviews...`)
  for (const { id, ...review } of SEED_REVIEWS) {
    await setDoc(doc(db, 'reviews', id), review)
  }

  console.log('Done! Now paste firebase/firestore.rules into Firestore → Rules.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err.message)
  console.error('Tip: make sure Firestore was created in TEST MODE (or rules allow writes) while seeding.')
  process.exit(1)
})
