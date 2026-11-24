import glowBundle from '../assets/home-page/glow-bundle.jpeg'
import plumpingBundle from '../assets/home-page/plumping-bundle.jpeg'
import antiHairFall from '../assets/home-page/anti-hair-fall.jpeg'

// Categories are managed by the admin in Firestore; slugs are free-form strings.
export type Category = string

export interface CategoryDoc {
  id: string
  slug: string
  name_en: string
  name_ar: string
  image: string
  sort: number
  is_active: boolean
}

export type SkinType = 'all' | 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal'

// One row of the "Key Active Ingredients" leaflet table.
export interface KeyIngredient {
  name_en: string
  name_ar: string
  concentration: string
  function_en: string
  function_ar: string
}

export interface Product {
  id: string
  slug: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  category: Category
  price: number
  sale_price: number | null
  images: string[]
  skin_types: SkinType[]
  stock: number
  is_featured: boolean
  is_active: boolean
  ingredients_en: string
  ingredients_ar: string
  how_to_use_en: string
  how_to_use_ar: string
  // Leaflet sections — optional so older Firestore docs keep working.
  // Multiline strings hold one item per line.
  clinical_benefits_en?: string
  clinical_benefits_ar?: string
  why_choose_en?: string
  why_choose_ar?: string
  indications_en?: string
  indications_ar?: string
  key_ingredients?: KeyIngredient[]
  rating: number
  reviews_count: number
  sales_count: number
  created_at: number
}

export interface Review {
  id: string
  product_id: string
  author_name: string
  rating: number
  comment: string
  created_at: number
}

/**
 * One card in the home page "magazine" section. Managed by the admin in
 * Firestore (`home_slides`); DEFAULT_HOME_SLIDES below is the fallback used
 * before the collection has been seeded.
 */
export interface HomeSlide {
  id: string
  image: string
  tag_en: string
  tag_ar: string
  title_en: string
  title_ar: string
  text_en: string
  text_ar: string
  link: string
  sort: number
  is_active: boolean
}

/**
 * One promo card inside the storefront offers popup. Fully managed by the
 * admin in Firestore (`offers`) — there is no bundled fallback, so the popup
 * simply stays hidden until the admin publishes something.
 */
export interface Offer {
  id: string
  image: string
  badge_en: string
  badge_ar: string
  title_en: string
  title_ar: string
  text_en: string
  text_ar: string
  /** Optional coupon code shown in a copyable box. */
  code: string
  cta_en: string
  cta_ar: string
  link: string
  sort: number
  is_active: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface OrderInput {
  customer_name: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
  items: {
    product_id: string
    slug: string
    name_en: string
    name_ar: string
    price: number
    quantity: number
  }[]
  subtotal: number
  shipping: number
  total: number
}

export interface Order extends OrderInput {
  id: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  created_at: number
}

// Built-in catalog categories — used to seed Firestore and as an offline fallback.
export const DEFAULT_CATEGORIES: CategoryDoc[] = [
  { id: 'cleanser', slug: 'cleanser', name_en: 'Cleansers', name_ar: 'غسول', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80', sort: 1, is_active: true },
  { id: 'serum', slug: 'serum', name_en: 'Serums', name_ar: 'سيروم', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80', sort: 2, is_active: true },
  { id: 'moisturizer', slug: 'moisturizer', name_en: 'Moisturizers', name_ar: 'مرطبات', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=600&q=80', sort: 3, is_active: true },
  { id: 'sunscreen', slug: 'sunscreen', name_en: 'Sunscreen', name_ar: 'واقي شمس', image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80', sort: 4, is_active: true },
  { id: 'toner', slug: 'toner', name_en: 'Toners', name_ar: 'تونر', image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=600&q=80', sort: 5, is_active: true },
  { id: 'mask', slug: 'mask', name_en: 'Masks', name_ar: 'ماسكات', image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=600&q=80', sort: 6, is_active: true },
  { id: 'eye-care', slug: 'eye-care', name_en: 'Eye Care', name_ar: 'العناية بالعين', image: '', sort: 7, is_active: true },
  { id: 'body-care', slug: 'body-care', name_en: 'Body Care', name_ar: 'العناية بالجسم', image: '', sort: 8, is_active: true },
]

// Bundled campaign shots — the out-of-the-box home page magazine section.
export const DEFAULT_HOME_SLIDES: HomeSlide[] = [
  {
    id: 'anti-hair-fall',
    image: antiHairFall,
    tag_en: 'Issue 01',
    tag_ar: 'العدد ٠١',
    title_en: 'Stronger, fuller hair',
    title_ar: 'شعر أقوى وأكثف',
    text_en: 'Visible anti hair-fall results in just 15–21 days.',
    text_ar: 'نتائج ملحوظة ضد تساقط الشعر في ١٥–٢١ يوم بس.',
    link: '/shop',
    sort: 1,
    is_active: true,
  },
  {
    id: 'glow-bundle',
    image: glowBundle,
    tag_en: 'Issue 02',
    tag_ar: 'العدد ٠٢',
    title_en: 'The Glow Ritual',
    title_ar: 'طقس الإشراق',
    text_en: 'Vitamin C, Hyaluronic & a fresh boost of radiance.',
    text_ar: 'فيتامين C، الهيالورونيك ولمسة نضارة منعشة.',
    link: '/shop',
    sort: 2,
    is_active: true,
  },
  {
    id: 'plumping-bundle',
    image: plumpingBundle,
    tag_en: 'Issue 03',
    tag_ar: 'العدد ٠٣',
    title_en: 'Plump & Bounce',
    title_ar: 'امتلاء ونضارة',
    text_en: 'Collagen, Peptides & Squalane for skin that springs back.',
    text_ar: 'كولاجين، ببتيدات وسكوالان لبشرة مشدودة ومرنة.',
    link: '/shop',
    sort: 3,
    is_active: true,
  },
]

export const ORDER_STATUSES: Order['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]

export const SKIN_TYPES: SkinType[] = ['all', 'dry', 'oily', 'combination', 'sensitive', 'normal']

export const FREE_SHIPPING_THRESHOLD = 800
export const SHIPPING_FEE = 60
