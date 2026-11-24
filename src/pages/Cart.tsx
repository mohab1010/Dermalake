import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cartShipping, cartSubtotal, useCart } from '../store/cart'
import { effectivePrice, formatPrice, localized } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD } from '../lib/types'
import { categoryLabel, useCategories } from '../store/catalog'
import { QuantityPicker } from '../components/ui/QuantityPicker'
import { LinkButton } from '../components/ui/Button'
import { CartIcon, TrashIcon } from '../components/ui/Icons'

export function Cart() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const items = useCart((s) => s.items)
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)
  const categories = useCategories()

  const subtotal = cartSubtotal(items)
  const shipping = cartShipping(subtotal)

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-28 text-center">
        <span className="rounded-full bg-lake-50 p-6 text-lake-300">
          <CartIcon className="h-10 w-10" />
        </span>
        <h1 className="font-display text-3xl text-lake-950">{t('cart.empty')}</h1>
        <p className="text-stone-soft">{t('cart.emptyText')}</p>
        <LinkButton to="/shop">{t('cart.startShopping')}</LinkButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display mb-10 text-4xl text-lake-950">{t('cart.title')}</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ul className="space-y-4">
          {items.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex gap-4 rounded-2xl bg-white p-4 shadow-soft sm:gap-6 sm:p-5"
            >
              <Link to={`/product/${product.slug}`} className="shrink-0">
                <img
                  src={product.images[0]}
                  alt={localized(product, 'name', lang)}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] tracking-[0.14em] text-stone-soft uppercase">
                      {categoryLabel(product.category, lang, categories)}
                    </p>
                    <Link
                      to={`/product/${product.slug}`}
                      className="font-display mt-1 block leading-snug text-lake-950 hover:text-lake-700"
                    >
                      {localized(product, 'name', lang)}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(product.id)}
                    aria-label={t('cart.remove')}
                    className="cursor-pointer p-1 text-stone-soft transition-colors hover:text-red-500"
                  >
                    <TrashIcon className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <QuantityPicker
                    small
                    value={quantity}
                    max={product.stock}
                    onChange={(v) => setQuantity(product.id, v)}
                  />
                  <span className="font-semibold text-lake-900">
                    {formatPrice(effectivePrice(product) * quantity, lang)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="h-fit rounded-2xl bg-white p-6 shadow-soft lg:sticky lg:top-24">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('checkout.orderSummary')}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-soft">{t('cart.subtotal')}</dt>
              <dd className="font-medium">{formatPrice(subtotal, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-soft">{t('cart.shipping')}</dt>
              <dd className="font-medium">
                {shipping === 0 ? (
                  <span className="text-lake-500">{t('cart.freeShipping')}</span>
                ) : (
                  formatPrice(shipping, lang)
                )}
              </dd>
            </div>
            {shipping > 0 && (
              <p className="rounded-xl bg-lake-50 px-3.5 py-2.5 text-xs text-lake-700">
                {t('cart.freeShippingNote', {
                  amount: new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG').format(FREE_SHIPPING_THRESHOLD),
                })}
              </p>
            )}
            <div className="flex justify-between border-t border-lake-900/10 pt-4 text-base">
              <dt className="font-semibold text-lake-950">{t('cart.grandTotal')}</dt>
              <dd className="font-display text-xl text-lake-900">
                {formatPrice(subtotal + shipping, lang)}
              </dd>
            </div>
          </dl>
          <LinkButton to="/checkout" className="mt-6 w-full">
            {t('cart.checkout')}
          </LinkButton>
          <Link
            to="/shop"
            className="mt-4 block text-center text-sm text-lake-700 hover:text-lake-900"
          >
            {t('cart.continueShopping')}
          </Link>
        </aside>
      </div>
    </div>
  )
}
