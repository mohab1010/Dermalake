import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '../lib/types'
import { effectivePrice } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../lib/types'

interface CartState {
  items: CartItem[]
  add: (product: Product, quantity?: number) => void
  remove: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
                  : i,
              ),
            }
          }
          return { items: [...state.items, { product, quantity }] }
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId
                    ? { ...i, quantity: Math.min(quantity, i.product.stock) }
                    : i,
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'dermalake-cart' },
  ),
)

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + effectivePrice(i.product) * i.quantity, 0)
}

export function cartShipping(subtotal: number): number {
  return subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}
