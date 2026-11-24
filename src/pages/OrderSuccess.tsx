import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { Order } from '../lib/types'
import { formatPrice } from '../lib/format'
import { LinkButton } from '../components/ui/Button'
import { CheckIcon } from '../components/ui/Icons'

export function OrderSuccess() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const location = useLocation()
  const state = location.state as { orderId?: string; order?: Order } | null
  const orderId = state?.orderId
  const order = state?.order

  if (!orderId) return <Navigate to="/" replace />

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-24 text-center">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="rounded-full bg-lake-700 p-6 text-cream shadow-lift"
      >
        <CheckIcon className="h-12 w-12" />
      </motion.span>
      <h1 className="font-display text-3xl text-lake-950 sm:text-4xl">{t('success.title')}</h1>
      <p className="rounded-full bg-lake-50 px-5 py-2 text-sm text-lake-700">
        {t('success.orderNumber')}: <span className="font-semibold" dir="ltr">{orderId}</span>
      </p>
      <p className="text-stone-soft">{t('success.text')}</p>

      {order && (
        <div className="w-full rounded-2xl bg-white p-6 text-start shadow-soft">
          <h2 className="font-display mb-4 text-lg text-lake-950">{t('checkout.orderSummary')}</h2>
          <ul className="space-y-2.5 text-sm">
            {order.items.map((item, i) => (
              <li key={`${item.product_id}-${i}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {lang === 'ar' ? item.name_ar : item.name_en}
                  <span className="ms-2 text-xs text-stone-soft">× {item.quantity}</span>
                </span>
                <span className="font-medium whitespace-nowrap">
                  {formatPrice(item.price * item.quantity, lang)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-lake-900/10 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-soft">{t('cart.shipping')}</dt>
              <dd>{order.shipping === 0 ? t('cart.freeShipping') : formatPrice(order.shipping, lang)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-semibold">{t('cart.grandTotal')}</dt>
              <dd className="font-display text-lg text-lake-900">{formatPrice(order.total, lang)}</dd>
            </div>
            <p className="pt-1 text-xs text-stone-soft">{t('checkout.codNote')}</p>
          </dl>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <LinkButton to="/shop">{t('success.keepShopping')}</LinkButton>
        <LinkButton to="/" variant="outline">{t('success.backHome')}</LinkButton>
      </div>
    </div>
  )
}
