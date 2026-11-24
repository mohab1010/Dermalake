import { useState, type FormEvent } from 'react'
import { errorKey } from '../lib/errors'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cartShipping, cartSubtotal, useCart } from '../store/cart'
import { effectivePrice, formatPrice, localized } from '../lib/format'
import { fetchProducts, invalidateCatalogCache, placeOrder } from '../lib/api'
import { Button } from '../components/ui/Button'
import { CheckIcon } from '../components/ui/Icons'

interface FormState {
  name: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
}

const initialForm: FormState = { name: '', phone: '', email: '', address: '', city: '', notes: '' }

export function Checkout() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clear)
  const setQuantity = useCart((s) => s.setQuantity)
  const removeItem = useCart((s) => s.remove)

  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stockError, setStockError] = useState(false)
  // once an order is placed the cart empties — this flag keeps us from
  // bouncing to /cart instead of /order-success
  const [placed, setPlaced] = useState(false)

  const subtotal = cartSubtotal(items)
  const shipping = cartShipping(subtotal)
  const total = subtotal + shipping

  if (items.length === 0 && !placed) return <Navigate to="/cart" replace />

  function set(field: keyof FormState) {
    return (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = t('checkout.required')
    else if (form.name.trim().length > 80) next.name = t('checkout.tooLong')
    if (!form.address.trim()) next.address = t('checkout.required')
    else if (form.address.trim().length > 200) next.address = t('checkout.tooLong')
    if (!form.city.trim()) next.city = t('checkout.required')
    else if (form.city.trim().length > 60) next.city = t('checkout.tooLong')
    const phone = form.phone.replace(/[\s-]/g, '')
    if (!phone) next.phone = t('checkout.required')
    else if (!/^(\+?2?01[0-9]{9}|0[0-9]{8,10})$/.test(phone)) next.phone = t('checkout.invalidPhone')
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = t('checkout.invalidEmail')
    }
    if (form.notes.trim().length > 500) next.notes = t('checkout.tooLong')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    setStockError(false)

    try {
      // Prices/stock in the cart can be stale (added a while ago, admin
      // changed something) — re-check against Firestore before charging.
      invalidateCatalogCache()
      const freshProducts = await fetchProducts()
      let hasStockIssue = false
      for (const { product, quantity } of items) {
        const fresh = freshProducts.find((p) => p.id === product.id)
        if (!fresh || fresh.stock <= 0) {
          removeItem(product.id)
          hasStockIssue = true
        } else if (fresh.stock < quantity) {
          setQuantity(product.id, fresh.stock)
          hasStockIssue = true
        }
      }
      if (hasStockIssue) {
        setStockError(true)
        setSubmitting(false)
        return
      }

      const orderItems = items.map(({ product, quantity }) => {
        const fresh = freshProducts.find((p) => p.id === product.id) ?? product
        return {
          product_id: fresh.id,
          slug: fresh.slug,
          name_en: fresh.name_en,
          name_ar: fresh.name_ar,
          price: effectivePrice(fresh),
          quantity,
        }
      })
      const freshSubtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      const freshShipping = cartShipping(freshSubtotal)
      const freshTotal = freshSubtotal + freshShipping

      const order = await placeOrder({
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        notes: form.notes.trim(),
        items: orderItems,
        subtotal: freshSubtotal,
        shipping: freshShipping,
        total: freshTotal,
      })
      setPlaced(true)
      clearCart()
      navigate('/order-success', { state: { orderId: order.id, order }, replace: true })
    } catch (err) {
      setSubmitError(errorKey(err, 'checkout.orderError'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (hasError?: string) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-lake-500 ${
      hasError ? 'border-red-400' : 'border-lake-900/15'
    }`

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display mb-10 text-4xl text-lake-950">{t('checkout.title')}</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          {/* Contact */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
            <legend className="sr-only">{t('checkout.contactInfo')}</legend>
            <h2 className="font-display mb-5 text-xl text-lake-950">{t('checkout.contactInfo')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-name" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.name')} *
                </label>
                <input id="co-name" maxLength={80} value={form.name} onChange={set('name')} className={inputClass(errors.name)} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="co-phone" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.phone')} *
                </label>
                <input
                  id="co-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={set('phone')}
                  className={`${inputClass(errors.phone)} text-start`}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-email" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.email')}
                </label>
                <input
                  id="co-email"
                  type="email"
                  dir="ltr"
                  maxLength={120}
                  value={form.email}
                  onChange={set('email')}
                  className={`${inputClass(errors.email)} text-start`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>
          </fieldset>

          {/* Shipping */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
            <legend className="sr-only">{t('checkout.shippingInfo')}</legend>
            <h2 className="font-display mb-5 text-xl text-lake-950">{t('checkout.shippingInfo')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="co-address" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.address')} *
                </label>
                <input id="co-address" maxLength={200} value={form.address} onChange={set('address')} className={inputClass(errors.address)} />
                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
              </div>
              <div>
                <label htmlFor="co-city" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.city')} *
                </label>
                <input id="co-city" maxLength={60} value={form.city} onChange={set('city')} className={inputClass(errors.city)} />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-notes" className="mb-1.5 block text-sm font-medium">
                  {t('checkout.notes')}
                </label>
                <textarea
                  id="co-notes"
                  rows={3}
                  maxLength={500}
                  value={form.notes}
                  onChange={set('notes')}
                  className={`${inputClass(errors.notes)} resize-none`}
                />
                {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
              </div>
            </div>
          </fieldset>

          {/* Payment */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
            <legend className="sr-only">{t('checkout.payment')}</legend>
            <h2 className="font-display mb-5 text-xl text-lake-950">{t('checkout.payment')}</h2>
            <div className="flex items-start gap-3 rounded-xl border border-lake-500 bg-lake-50/60 p-4">
              <span className="mt-0.5 rounded-full bg-lake-700 p-1 text-cream">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="font-medium text-lake-950">{t('checkout.cod')}</p>
                <p className="mt-1 text-sm text-stone-soft">{t('checkout.codNote')}</p>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Summary */}
        <aside className="rounded-2xl bg-white p-6 shadow-soft lg:sticky lg:top-24">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('checkout.orderSummary')}</h2>
          <ul className="mb-5 space-y-3">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-3 text-sm">
                <img
                  src={product.images[0]}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{localized(product, 'name', lang)}</p>
                  <p className="text-xs text-stone-soft">× {quantity}</p>
                </div>
                <span className="font-medium">
                  {formatPrice(effectivePrice(product) * quantity, lang)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2.5 border-t border-lake-900/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-soft">{t('cart.subtotal')}</dt>
              <dd>{formatPrice(subtotal, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-soft">{t('cart.shipping')}</dt>
              <dd>{shipping === 0 ? t('cart.freeShipping') : formatPrice(shipping, lang)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base">
              <dt className="font-semibold">{t('cart.grandTotal')}</dt>
              <dd className="font-display text-xl text-lake-900">{formatPrice(total, lang)}</dd>
            </div>
          </dl>
          {stockError && (
            <p className="mt-4 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold">
              {t('checkout.stockChanged')}
            </p>
          )}
          {submitError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {t(submitError)}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="mt-6 w-full">
            {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
          </Button>
        </aside>
      </form>
    </div>
  )
}
