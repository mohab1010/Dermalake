import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Product } from '../lib/types'
import { fetchProducts } from '../lib/api'
import { useWishlist } from '../store/wishlist'
import { ProductCard } from '../components/product/ProductCard'
import { GridSkeleton } from '../components/ui/Skeleton'
import { LinkButton } from '../components/ui/Button'
import { HeartIcon } from '../components/ui/Icons'

export function Wishlist() {
  const { t } = useTranslation()
  const ids = useWishlist((s) => s.ids)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setLoadError(true))
  }, [])

  const saved = products?.filter((p) => ids.includes(p.id)) ?? null

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-28 text-center">
        <p className="text-stone-soft">{t('common.error')}</p>
      </div>
    )
  }

  if (saved && saved.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-28 text-center">
        <span className="rounded-full bg-lake-50 p-6 text-lake-300">
          <HeartIcon className="h-10 w-10" />
        </span>
        <h1 className="font-display text-3xl text-lake-950">{t('wishlist.empty')}</h1>
        <p className="text-stone-soft">{t('wishlist.emptyText')}</p>
        <LinkButton to="/shop">{t('wishlist.browse')}</LinkButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display mb-10 text-4xl text-lake-950">{t('wishlist.title')}</h1>
      {!saved ? (
        <GridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
