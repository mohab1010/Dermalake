import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'
import { SEED_PRODUCTS, SEED_REVIEWS } from '../data/products'
import { DEFAULT_CATEGORIES, DEFAULT_HOME_SLIDES } from './types'
import type { CategoryDoc, HomeSlide, Offer, Order, OrderInput, Product, Review } from './types'

// Data layer for Dermalake. When Firebase env vars are present it reads/writes
// Firestore; otherwise it falls back to bundled seed data + localStorage so the
// site is fully usable before the Firebase project is set up.

const LOCAL_REVIEWS_KEY = 'dermalake-local-reviews'
const LOCAL_ORDERS_KEY = 'dermalake-local-orders'

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function writeLocal<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items))
}

let productsCache: Product[] | null = null
let categoriesCache: CategoryDoc[] | null = null
let homeSlidesCache: HomeSlide[] | null = null
let offersCache: Offer[] | null = null

// Called after the admin edits the catalog so the storefront refetches.
export function invalidateCatalogCache() {
  productsCache = null
  categoriesCache = null
  homeSlidesCache = null
  offersCache = null
}

/**
 * Promo cards for the offers popup. Unlike the other collections there is no
 * bundled fallback — an empty list just means the popup never opens.
 */
export async function fetchOffers(): Promise<Offer[]> {
  if (offersCache) return offersCache

  if (!isFirebaseConfigured) {
    offersCache = []
    return offersCache
  }

  try {
    const snap = await getDocs(collection(getDb(), 'offers'))
    offersCache = snap.docs
      .map((d) => ({ ...(d.data() as Omit<Offer, 'id'>), id: d.id }))
      .filter((o) => o.is_active !== false)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  } catch {
    // e.g. security rules not deployed yet — keep the storefront usable
    offersCache = []
  }
  return offersCache
}

/** Home page magazine cards. Falls back to the bundled defaults when unset. */
export async function fetchHomeSlides(): Promise<HomeSlide[]> {
  if (homeSlidesCache) return homeSlidesCache

  if (!isFirebaseConfigured) {
    homeSlidesCache = DEFAULT_HOME_SLIDES
    return homeSlidesCache
  }

  try {
    const snap = await getDocs(collection(getDb(), 'home_slides'))
    const slides = snap.docs
      .map((d) => ({ ...(d.data() as Omit<HomeSlide, 'id'>), id: d.id }))
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    // nothing published yet — show the bundled campaign shots instead of a gap
    homeSlidesCache = slides.length > 0 ? slides : DEFAULT_HOME_SLIDES
  } catch {
    // e.g. security rules not deployed yet — keep the storefront usable
    homeSlidesCache = DEFAULT_HOME_SLIDES
  }
  return homeSlidesCache
}

export async function fetchCategories(): Promise<CategoryDoc[]> {
  if (categoriesCache) return categoriesCache

  if (!isFirebaseConfigured) {
    categoriesCache = DEFAULT_CATEGORIES
    return categoriesCache
  }

  try {
    const snap = await getDocs(collection(getDb(), 'categories'))
    const categories = snap.docs
      .map((d) => ({ ...(d.data() as Omit<CategoryDoc, 'id'>), id: d.id }))
      // categories saved before is_active existed default to visible
      .filter((c) => c.is_active !== false)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    categoriesCache = categories.length > 0 ? categories : DEFAULT_CATEGORIES
  } catch {
    // e.g. security rules not deployed yet — keep the storefront usable
    categoriesCache = DEFAULT_CATEGORIES
  }
  return categoriesCache
}

export async function fetchProducts(): Promise<Product[]> {
  if (productsCache) return productsCache

  if (!isFirebaseConfigured) {
    productsCache = SEED_PRODUCTS
    return productsCache
  }

  const snap = await getDocs(collection(getDb(), 'products'))
  const allProducts = snap.docs.map((d) => ({ ...(d.data() as Omit<Product, 'id'>), id: d.id }))
  // products saved before is_active existed default to visible
  const products = allProducts.filter((p) => p.is_active !== false)
  // If the project exists but hasn't been seeded yet, fall back to local data
  productsCache = allProducts.length > 0 ? products : SEED_PRODUCTS
  return productsCache
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const products = await fetchProducts()
  return products.find((p) => p.slug === slug) ?? null
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  if (!isFirebaseConfigured) {
    const local = readLocal<Review>(LOCAL_REVIEWS_KEY)
    return [...SEED_REVIEWS, ...local]
      .filter((r) => r.product_id === productId)
      .sort((a, b) => b.created_at - a.created_at)
  }

  const q = query(
    collection(getDb(), 'reviews'),
    where('product_id', '==', productId),
    orderBy('created_at', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Review, 'id'>), id: d.id }))
}

export interface SubmittedReview {
  review: Review
  rating: number
  reviews_count: number
}

function nextAverage(currentRating: number, currentCount: number, newRating: number) {
  const reviews_count = currentCount + 1
  const rating = Number(((currentRating * currentCount + newRating) / reviews_count).toFixed(2))
  return { rating, reviews_count }
}

export async function submitReview(review: Omit<Review, 'id' | 'created_at'>): Promise<SubmittedReview> {
  const data = { ...review, created_at: Date.now() }

  if (!isFirebaseConfigured) {
    const saved: Review = { ...data, id: `local-${crypto.randomUUID()}` }
    writeLocal(LOCAL_REVIEWS_KEY, [...readLocal<Review>(LOCAL_REVIEWS_KEY), saved])

    const products = await fetchProducts()
    const product = products.find((p) => p.id === review.product_id)
    const { rating, reviews_count } = product
      ? nextAverage(product.rating, product.reviews_count, review.rating)
      : { rating: review.rating, reviews_count: 1 }
    if (product) {
      product.rating = rating
      product.reviews_count = reviews_count
    }
    return { review: saved, rating, reviews_count }
  }

  const ref = await addDoc(collection(getDb(), 'reviews'), data)

  const productRef = doc(getDb(), 'products', review.product_id)
  const box: { aggregate?: { rating: number; reviews_count: number } } = {}
  try {
    await runTransaction(getDb(), async (tx) => {
      const snap = await tx.get(productRef)
      if (!snap.exists()) return
      const current = snap.data() as Product
      box.aggregate = nextAverage(current.rating ?? 0, current.reviews_count ?? 0, review.rating)
      tx.update(productRef, box.aggregate)
    })
  } catch {
    // review is saved either way — the rating aggregate can lag until the next write
  }
  invalidateCatalogCache()

  return {
    review: { ...data, id: ref.id },
    rating: box.aggregate?.rating ?? review.rating,
    reviews_count: box.aggregate?.reviews_count ?? 1,
  }
}

export async function placeOrder(input: OrderInput): Promise<Order> {
  const data = { ...input, status: 'pending' as const, created_at: Date.now() }

  if (!isFirebaseConfigured) {
    const saved: Order = { ...data, id: `DL-${Date.now().toString(36).toUpperCase()}` }
    writeLocal(LOCAL_ORDERS_KEY, [...readLocal<Order>(LOCAL_ORDERS_KEY), saved])

    const products = await fetchProducts()
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.product_id)
      if (product) product.sales_count = (product.sales_count ?? 0) + item.quantity
    }
    return saved
  }

  const ref = await addDoc(collection(getDb(), 'orders'), data)

  // Best-sellers are derived from real orders — bump each product's sales
  // counter so the storefront and admin dashboard can rank by it.
  try {
    const batch = writeBatch(getDb())
    for (const item of input.items) {
      batch.update(doc(getDb(), 'products', item.product_id), {
        sales_count: increment(item.quantity),
      })
    }
    await batch.commit()
    invalidateCatalogCache()
  } catch {
    // order is already saved — a failed counter bump just delays the ranking
  }

  return { ...data, id: ref.id }
}
