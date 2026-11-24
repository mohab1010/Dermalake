import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { Product } from '../../lib/types'
import { discountPercent, effectivePrice, formatPrice, localized } from '../../lib/format'
import { useCart } from '../../store/cart'
import { useWishlist } from '../../store/wishlist'
import { categoryLabel, useCategories } from '../../store/catalog'
import { useToast } from '../ui/toastStore'
import { CartIcon, HeartIcon } from '../ui/Icons'
import { RatingStars } from './RatingStars'

export function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const addToCart = useCart((s) => s.add)
  const wishlistIds = useWishlist((s) => s.ids)
  const toggleWishlist = useWishlist((s) => s.toggle)
  const showToast = useToast((s) => s.show)
  const categories = useCategories()

  const inWishlist = wishlistIds.includes(product.id)
  const discount = discountPercent(product)
  const outOfStock = product.stock <= 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl bg-white shadow-soft transition-shadow duration-300 hover:shadow-lift"
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
          <img
            src={product.images[0]}
            alt={localized(product, 'name', lang)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute start-3 top-3 flex flex-col gap-1.5">
            {discount && (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-white">
                -{discount}%
              </span>
            )}
            {product.is_featured && (
              <span className="rounded-full bg-lake-900 px-2.5 py-1 text-[11px] font-medium text-cream">
                {t('product.featured')}
              </span>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={t('nav.wishlist')}
        className={`absolute end-3 top-3 cursor-pointer rounded-full bg-white/90 p-2.5 shadow-soft transition-colors ${
          inWishlist ? 'text-gold' : 'text-lake-900 hover:text-gold'
        }`}
      >
        <HeartIcon filled={inWishlist} className="h-4.5 w-4.5" />
      </button>

      <div className="space-y-2 p-5">
        <p className="text-xs tracking-[0.14em] text-stone-soft uppercase">
          {categoryLabel(product.category, lang, categories)}
        </p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-display text-base leading-snug text-lake-950 transition-colors hover:text-lake-700">
            {localized(product, 'name', lang)}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-stone-soft">
          <RatingStars rating={product.rating} starClass="w-3.5 h-3.5" />
          <span>({product.reviews_count})</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lake-900">
              {formatPrice(effectivePrice(product), lang)}
            </span>
            {product.sale_price && (
              <span className="text-xs text-stone-soft line-through">
                {formatPrice(product.price, lang)}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => {
              addToCart(product)
              showToast(t('product.addedToCart'))
            }}
            aria-label={t('product.addToCart')}
            className="cursor-pointer rounded-full bg-lake-900 p-2.5 text-cream transition-colors hover:bg-lake-700 disabled:cursor-not-allowed disabled:bg-stone-soft/30"
          >
            <CartIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  )
}
