import type { Product } from './types'

export function formatPrice(amount: number, lang: string): string {
  const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG').format(amount)
  return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`
}

export function localized(product: Product, field: 'name' | 'description' | 'ingredients' | 'how_to_use', lang: string): string {
  return product[`${field}_${lang === 'ar' ? 'ar' : 'en'}`]
}

export function effectivePrice(product: Product): number {
  return product.sale_price ?? product.price
}

export function discountPercent(product: Product): number | null {
  if (!product.sale_price) return null
  return Math.round((1 - product.sale_price / product.price) * 100)
}
