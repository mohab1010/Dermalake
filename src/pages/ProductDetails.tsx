import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { Product } from '../lib/types'
import { fetchProductBySlug, fetchProducts } from '../lib/api'
import { discountPercent, effectivePrice, formatPrice, localized } from '../lib/format'
import { useCart } from '../store/cart'
import { useWishlist } from '../store/wishlist'
import { categoryLabel, useCategories } from '../store/catalog'
import { useToast } from '../components/ui/toastStore'
import { Button } from '../components/ui/Button'
import { QuantityPicker } from '../components/ui/QuantityPicker'
import { HeartIcon, CartIcon } from '../components/ui/Icons'
import { RatingStars } from '../components/product/RatingStars'
import { ReviewSection } from '../components/product/ReviewSection'
import { ProductCard } from '../components/product/ProductCard'
import { NotFound } from './NotFound'

type Tab = 'description' | 'ingredients' | 'howToUse'

// Leaflet fields store one item per line.
function toLines(value: string | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function CheckItem({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-charcoal/80">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-lake-700"
        aria-hidden
      >
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="m6.5 10.5 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </li>
  )
}

export function ProductDetails() {
  const { slug } = useParams<{ slug: string }>()
  // remounting on slug change gives every field (image, quantity, tab, etc.)
  // a fresh initial state for free, instead of resetting each one by hand
  return <ProductDetailsView key={slug} slug={slug} />
}

function ProductDetailsView({ slug }: { slug?: string }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [similar, setSimilar] = useState<Product[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<Tab>('description')
  const [loadError, setLoadError] = useState(false)

  const addToCart = useCart((s) => s.add)
  const wishlistIds = useWishlist((s) => s.ids)
  const toggleWishlist = useWishlist((s) => s.toggle)
  const showToast = useToast((s) => s.show)
  const categories = useCategories()

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    window.scrollTo({ top: 0 })
    fetchProductBySlug(slug)
      .then((p) => {
        if (cancelled) return
        setProduct(p)
        if (p) {
          fetchProducts()
            .then((all) => {
              if (!cancelled) {
                setSimilar(all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4))
              }
            })
            .catch(() => {
              // similar products are a nice-to-have — fail silently
            })
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-28 text-center">
        <p className="text-stone-soft">{t('common.error')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (product === undefined) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="skeleton aspect-square rounded-[2rem]" />
        <div className="space-y-4 pt-6">
          <div className="skeleton h-4 w-1/4 rounded-full" />
          <div className="skeleton h-9 w-3/4 rounded-full" />
          <div className="skeleton h-4 w-full rounded-full" />
          <div className="skeleton h-4 w-2/3 rounded-full" />
        </div>
      </div>
    )
  }

  if (product === null) return <NotFound />

  const inWishlist = wishlistIds.includes(product.id)
  const discount = discountPercent(product)
  const outOfStock = product.stock <= 0

  const tabs: { key: Tab; label: string; content: string }[] = [
    { key: 'description', label: t('product.description'), content: localized(product, 'description', lang) },
    { key: 'ingredients', label: t('product.ingredients'), content: localized(product, 'ingredients', lang) },
    { key: 'howToUse', label: t('product.howToUse'), content: localized(product, 'how_to_use', lang) },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="overflow-hidden rounded-[2rem] bg-cream-dark shadow-soft">
            <img
              src={product.images[activeImage] ?? product.images[0]}
              alt={localized(product, 'name', lang)}
              fetchPriority="high"
              decoding="async"
              className="aspect-square w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.images.map((image, i) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                    i === activeImage ? 'border-lake-700' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={image} alt="" loading="lazy" decoding="async" className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="text-xs tracking-[0.18em] text-gold uppercase">
            {categoryLabel(product.category, lang, categories)}
          </p>
          <h1 className="font-display mt-3 text-3xl leading-tight text-lake-950 sm:text-4xl">
            {localized(product, 'name', lang)}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-sm text-stone-soft">
            <RatingStars rating={product.rating} />
            <span>
              {product.rating.toFixed(1)} · {t('product.reviewsCount', { count: product.reviews_count })}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-3xl text-lake-900">
              {formatPrice(effectivePrice(product), lang)}
            </span>
            {product.sale_price && (
              <>
                <span className="text-lg text-stone-soft line-through">
                  {formatPrice(product.price, lang)}
                </span>
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                  {t('product.sale')} {discount}%
                </span>
              </>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-charcoal/80">
            {localized(product, 'description', lang)}
          </p>

          {/* skin types */}
          <div className="mt-5 flex flex-wrap gap-2">
            {product.skin_types.map((s) => (
              <span key={s} className="rounded-full bg-lake-50 px-3.5 py-1.5 text-xs text-lake-700">
                {t(`skinTypes.${s}`)}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <QuantityPicker value={quantity} max={product.stock} onChange={(v) => setQuantity(Math.max(1, v))} />
            <Button
              disabled={outOfStock}
              className="flex-1 sm:flex-none sm:px-10"
              onClick={() => {
                addToCart(product, quantity)
                showToast(t('product.addedToCart'))
              }}
            >
              <CartIcon className="h-4.5 w-4.5" />
              {outOfStock ? t('product.outOfStock') : t('product.addToCart')}
            </Button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={t('nav.wishlist')}
              className={`cursor-pointer rounded-full border p-3.5 transition-colors ${
                inWishlist
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-lake-900/20 text-lake-900 hover:border-gold hover:text-gold'
              }`}
            >
              <HeartIcon filled={inWishlist} />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-10">
            <div className="flex gap-6 border-b border-lake-900/10">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm font-medium transition-colors ${
                    tab === key
                      ? 'border-lake-900 text-lake-900'
                      : 'border-transparent text-stone-soft hover:text-lake-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="pt-5 text-sm leading-relaxed text-charcoal/80">
              {tabs.find((x) => x.key === tab)?.content}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Leaflet — clinical benefits, why choose, key ingredients, indications */}
      <ProductLeaflet product={product} lang={lang} />

      {/* Reviews */}
      <div className="mt-20">
        <ReviewSection
          productId={product.id}
          onReviewSubmitted={(newRating, newCount) =>
            setProduct((p) => (p ? { ...p, rating: newRating, reviews_count: newCount } : p))
          }
        />
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display mb-8 text-2xl text-lake-950">{t('product.similar')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12">
        <Link to="/shop" className="text-sm font-medium text-lake-700 hover:text-lake-900">
          ← {t('cart.continueShopping')}
        </Link>
      </div>
    </div>
  )
}

function ProductLeaflet({ product, lang }: { product: Product; lang: string }) {
  const { t } = useTranslation()
  const suffix = lang === 'ar' ? 'ar' : 'en'

  const benefits = toLines(product[`clinical_benefits_${suffix}`])
  const whyChoose = toLines(product[`why_choose_${suffix}`])
  const indications = toLines(product[`indications_${suffix}`])
  const ingredients = (product.key_ingredients ?? []).filter((ing) => ing.name_en || ing.name_ar)

  if (benefits.length === 0 && whyChoose.length === 0 && indications.length === 0 && ingredients.length === 0) {
    return null
  }

  return (
    <div className="mt-20 grid gap-10">
      {benefits.length > 0 && (
        <section>
          <h2 className="font-display mb-6 text-2xl text-lake-950">{t('product.clinicalBenefits')}</h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {benefits.map((b) => (
              <CheckItem key={b}>{b}</CheckItem>
            ))}
          </ul>
        </section>
      )}

      {ingredients.length > 0 && (
        <section>
          <h2 className="font-display mb-6 text-2xl text-lake-950">{t('product.keyIngredients')}</h2>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="bg-lake-900 text-start text-cream">
                  <th className="px-5 py-3 text-start font-medium">{t('product.ingredient')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('product.concentration')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('product.function')}</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, i) => (
                  <tr key={i} className="border-t border-lake-900/10 align-top">
                    <td className="px-5 py-3.5 font-medium text-lake-950">
                      {lang === 'ar' ? ing.name_ar || ing.name_en : ing.name_en || ing.name_ar}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-charcoal/80">{ing.concentration}</td>
                    <td className="px-5 py-3.5 text-charcoal/80">
                      {lang === 'ar' ? ing.function_ar || ing.function_en : ing.function_en || ing.function_ar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {whyChoose.length > 0 && (
        <section>
          <h2 className="font-display mb-6 text-2xl text-lake-950">{t('product.whyChoose')}</h2>
          <ul className="grid grid-cols-1 gap-3">
            {whyChoose.map((w) => (
              <CheckItem key={w}>{w}</CheckItem>
            ))}
          </ul>
        </section>
      )}

      {indications.length > 0 && (
        <section>
          <h2 className="font-display mb-6 text-2xl text-lake-950">{t('product.indications')}</h2>
          <div className="flex flex-wrap gap-2">
            {indications.map((x) => (
              <span key={x} className="rounded-full bg-lake-50 px-4 py-2 text-sm text-lake-700">
                {x}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
