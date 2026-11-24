import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageClient } from './firebase'
import { DEFAULT_HOME_SLIDES } from './types'
import type { CategoryDoc, HomeSlide, Offer, Order, Product, Review } from './types'
import { errorKey } from './errors'

// Admin-only data layer. All of these calls require a signed-in admin —
// Firestore/Storage rules reject them otherwise.

export type ProductInput = Omit<Product, 'id'>
export type CategoryInput = Omit<CategoryDoc, 'id'>

// ---------- Products ----------

export async function adminFetchProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(getDb(), 'products'), orderBy('created_at', 'desc')))
  return snap.docs.map((d) => ({ ...(d.data() as ProductInput), id: d.id }))
}

export async function adminFetchProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(getDb(), 'products', id))
  return snap.exists() ? { ...(snap.data() as ProductInput), id: snap.id } : null
}

export async function adminCreateProduct(input: ProductInput): Promise<string> {
  const refDoc = await addDoc(collection(getDb(), 'products'), input)
  return refDoc.id
}

export async function adminUpdateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(getDb(), 'products', id), input)
}

export async function adminDeleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'products', id))
}

// ---------- Categories ----------

export async function adminFetchCategories(): Promise<CategoryDoc[]> {
  const snap = await getDocs(collection(getDb(), 'categories'))
  return snap.docs
    .map((d) => ({ ...(d.data() as CategoryInput), id: d.id }))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}

export async function adminSaveCategory(input: CategoryInput, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(getDb(), 'categories', id), input)
    return id
  }
  // slug doubles as the document id so storefront links stay readable
  await setDoc(doc(getDb(), 'categories', input.slug), input)
  return input.slug
}

export async function adminDeleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'categories', id))
}

// ---------- Home page slides ----------

export type HomeSlideInput = Omit<HomeSlide, 'id'>

export async function adminFetchHomeSlides(): Promise<HomeSlide[]> {
  const snap = await getDocs(collection(getDb(), 'home_slides'))
  return snap.docs
    .map((d) => ({ ...(d.data() as HomeSlideInput), id: d.id }))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}

export async function adminSaveHomeSlide(input: HomeSlideInput, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(getDb(), 'home_slides', id), { ...input })
    return id
  }
  const refDoc = await addDoc(collection(getDb(), 'home_slides'), input)
  return refDoc.id
}

export async function adminDeleteHomeSlide(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'home_slides', id))
}

/** Copies the bundled campaign cards into Firestore so they can be edited. */
export async function adminSeedHomeSlides(): Promise<void> {
  for (const slide of DEFAULT_HOME_SLIDES) {
    const { id: _id, ...rest } = slide
    await setDoc(doc(getDb(), 'home_slides', slide.id), rest)
  }
}

// ---------- Offers popup ----------

export type OfferInput = Omit<Offer, 'id'>

export async function adminFetchOffers(): Promise<Offer[]> {
  const snap = await getDocs(collection(getDb(), 'offers'))
  return snap.docs
    .map((d) => ({ ...(d.data() as OfferInput), id: d.id }))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}

export async function adminSaveOffer(input: OfferInput, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(getDb(), 'offers', id), { ...input })
    return id
  }
  const refDoc = await addDoc(collection(getDb(), 'offers'), input)
  return refDoc.id
}

export async function adminSetOfferActive(id: string, is_active: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'offers', id), { is_active })
}

export async function adminDeleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'offers', id))
}

// ---------- Reviews ----------

export async function adminFetchReviews(): Promise<Review[]> {
  const snap = await getDocs(query(collection(getDb(), 'reviews'), orderBy('created_at', 'desc')))
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Review, 'id'>), id: d.id }))
}

/**
 * Deletes a review, then recomputes the product's rating and reviews_count
 * from the remaining reviews so the stars always reflect reality.
 */
export async function adminDeleteReview(
  review: Review,
): Promise<{ rating: number; reviews_count: number }> {
  await deleteDoc(doc(getDb(), 'reviews', review.id))

  const snap = await getDocs(
    query(collection(getDb(), 'reviews'), where('product_id', '==', review.product_id)),
  )
  const ratings = snap.docs.map((d) => (d.data() as Omit<Review, 'id'>).rating)
  const reviews_count = ratings.length
  const rating = reviews_count
    ? Number((ratings.reduce((sum, r) => sum + r, 0) / reviews_count).toFixed(2))
    : 0

  try {
    await updateDoc(doc(getDb(), 'products', review.product_id), { rating, reviews_count })
  } catch {
    // the product may have been deleted — the review removal already succeeded
  }
  return { rating, reviews_count }
}

// ---------- Errors ----------

/** Maps a failed admin read to the i18n key the page should show. */
export function loadErrorKey(err: unknown): string {
  return errorKey(err, 'admin.loadError')
}

// ---------- Orders ----------

/** Live feed of all orders, newest first. Returns an unsubscribe function. */
export function adminSubscribeOrders(
  onOrders: (orders: Order[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(collection(getDb(), 'orders'), orderBy('created_at', 'desc'))
  return onSnapshot(
    q,
    (snap) => onOrders(snap.docs.map((d) => ({ ...(d.data() as Omit<Order, 'id'>), id: d.id }))),
    onError,
  )
}

export async function adminUpdateOrderStatus(id: string, status: Order['status']): Promise<void> {
  await updateDoc(doc(getDb(), 'orders', id), { status })
}

// ---------- Images ----------

const UPLOAD_TIMEOUT_MS = 20_000

/** Must stay in sync with the `request.resource.size` limit in firebase/storage.rules. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Why an upload failed, so the UI can tell the user something actionable.
 * Storage answers a too-big or wrong-type file with `storage/unauthorized`,
 * which is indistinguishable from a real permissions problem — so we check
 * both constraints here, before the request goes out.
 */
export type UploadErrorCode = 'too-large' | 'not-an-image' | 'unauthorized' | 'timeout' | 'failed'

export class UploadError extends Error {
  code: UploadErrorCode

  constructor(code: UploadErrorCode, message: string) {
    super(message)
    this.name = 'UploadError'
    this.code = code
  }
}

/** Maps a failed upload to the i18n key describing what the admin should do about it. */
export function uploadErrorKey(err: unknown): string {
  if (!(err instanceof UploadError)) return errorKey(err, 'admin.form.uploadError')
  switch (err.code) {
    case 'too-large':
      return 'admin.form.uploadTooLarge'
    case 'not-an-image':
      return 'admin.form.uploadNotImage'
    case 'unauthorized':
      return 'admin.form.uploadUnauthorized'
    case 'timeout':
      return 'admin.form.uploadTimeout'
    default:
      return 'admin.form.uploadError'
  }
}

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
}

/** Uploads a product/category image to Firebase Storage and returns its public URL. */
export async function adminUploadImage(file: File, folder = 'products'): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'

  // Browsers leave `file.type` empty for some formats (.jfif, HEIC from iOS),
  // and the Storage rule requires an image/* content type — fall back to the
  // extension rather than letting the rule reject a perfectly valid image.
  const contentType = file.type || EXT_CONTENT_TYPES[ext] || ''
  if (!contentType.startsWith('image/')) {
    throw new UploadError('not-an-image', `"${file.name}" is not a recognised image file.`)
  }
  if (file.size >= MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new UploadError('too-large', `"${file.name}" is ${mb}MB — the limit is 5MB.`)
  }

  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const storageRef = ref(getStorageClient(), path)

  // Firebase Storage's SDK calls can hang indefinitely (e.g. Storage not
  // enabled on the project yet) instead of rejecting — race it against a timeout.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new UploadError('timeout', 'Image upload timed out — check that Firebase Storage is enabled for this project.')),
      UPLOAD_TIMEOUT_MS,
    ),
  )

  try {
    await Promise.race([uploadBytes(storageRef, file, { contentType }), timeout])
  } catch (err) {
    if (err instanceof UploadError) throw err
    const code = (err as { code?: string }).code
    if (code === 'storage/unauthorized') {
      throw new UploadError(
        'unauthorized',
        'Storage rejected the upload. Make sure you are signed in as an admin listed in firebase/storage.rules.',
      )
    }
    throw new UploadError('failed', `Upload failed (${code ?? 'unknown error'}).`)
  }

  return getDownloadURL(storageRef)
}
