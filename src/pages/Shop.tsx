import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../lib/types'
import { SKIN_TYPES } from '../lib/types'
import { fetchProducts } from '../lib/api'
import { categoryLabel, useCategories } from '../store/catalog'
import { effectivePrice } from '../lib/format'
import { ProductCard } from '../components/product/ProductCard'
import { GridSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'

const MAX_PRICE = 700

export function Shop() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const categories = useCategories()

  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const skinType = params.get('skin') ?? ''
  const maxPrice = Number(params.get('max') ?? MAX_PRICE)
  const sort = params.get('sort') ?? 'newest'

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setLoadError(true))
  }, [])

  function setParam(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const filtered = useMemo(() => {
    if (!products) return null
    let list = products.filter((p) => effectivePrice(p) <= maxPrice)
    if (category) list = list.filter((p) => p.category === category)
    if (skinType) list = list.filter((p) => p.skin_types.includes(skinType as never))
    if (q) {
      const needle = q.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name_en.toLowerCase().includes(needle) ||
          p.name_ar.includes(needle) ||
          p.description_en.toLowerCase().includes(needle) ||
          p.description_ar.includes(needle),
      )
    }
    switch (sort) {
      case 'price-asc':
        return [...list].sort((a, b) => effectivePrice(a) - effectivePrice(b))
      case 'price-desc':
        return [...list].sort((a, b) => effectivePrice(b) - effectivePrice(a))
      case 'rating':
        return [...list].sort((a, b) => b.rating - a.rating)
      case 'sales':
        return [...list].sort((a, b) => b.sales_count - a.sales_count)
      default:
        return [...list].sort((a, b) => b.created_at - a.created_at)
    }
  }, [products, q, category, skinType, maxPrice, sort])

  const hasFilters = Boolean(q || category || skinType || params.get('max'))

  const selectClass =
    'w-full rounded-xl border border-lake-900/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-lake-500 cursor-pointer'

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="font-display text-4xl text-lake-950">{t('shop.title')}</h1>
        <p className="mt-2 text-sm text-stone-soft">
          {q ? (
            <>
              {t('shop.resultsFor')} <span className="font-semibold text-lake-900">"{q}"</span>
            </>
          ) : (
            t('shop.subtitle')
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('shop.category')}</label>
              <select value={category} onChange={(e) => setParam('category', e.target.value)} className={selectClass}>
                <option value="">{t('shop.allCategories')}</option>
                {(categories ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {categoryLabel(c.slug, i18n.language, categories)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('shop.skinType')}</label>
              <select value={skinType} onChange={(e) => setParam('skin', e.target.value)} className={selectClass}>
                <option value="">{t('skinTypes.all')}</option>
                {SKIN_TYPES.filter((s) => s !== 'all').map((s) => (
                  <option key={s} value={s}>
                    {t(`skinTypes.${s}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t('shop.price')}:{' '}
                <span className="font-semibold text-lake-900">
                  {new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-EG').format(maxPrice)}{' '}
                  {t('common.currency')}
                </span>
              </label>
              <input
                type="range"
                min={100}
                max={MAX_PRICE}
                step={20}
                value={maxPrice}
                onChange={(e) => setParam('max', e.target.value === String(MAX_PRICE) ? '' : e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('shop.sort')}</label>
              <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)} className={selectClass}>
                <option value="newest">{t('shop.sortNewest')}</option>
                <option value="sales">{t('shop.sortSales')}</option>
                <option value="rating">{t('shop.sortRating')}</option>
                <option value="price-asc">{t('shop.sortPriceAsc')}</option>
                <option value="price-desc">{t('shop.sortPriceDesc')}</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <Button variant="ghost" className="w-full py-2! text-xs" onClick={() => setParams({}, { replace: true })}>
              {t('shop.clearFilters')} ✕
            </Button>
          )}
        </aside>

        {/* Results */}
        <div>
          {loadError ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-20 text-center shadow-soft">
              <p className="text-stone-soft">{t('common.error')}</p>
            </div>
          ) : !filtered ? (
            <GridSkeleton count={8} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-20 text-center shadow-soft">
              <p className="text-stone-soft">{t('shop.empty')}</p>
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                {t('shop.clearFilters')}
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-soft">
                {t('shop.productsCount', { count: filtered.length })}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
