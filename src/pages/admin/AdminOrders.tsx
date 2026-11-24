import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import type { Order } from '../../lib/types'
import { ORDER_STATUSES } from '../../lib/types'
import { adminSubscribeOrders, adminUpdateOrderStatus, loadErrorKey } from '../../lib/admin-api'
import { formatPrice } from '../../lib/format'
import { useToast } from '../../components/ui/toastStore'
import { PageTitle, StatusBadge } from './ui'
import { adminSelect, formatOrderDate } from './styles'
import { errorKey } from '../../lib/errors'

/** Approximate height of one collapsed order row + the gap under it. */
const ROW_H = 84
const MIN_LIST_H = 260
const BOTTOM_GAP = 24

/**
 * Measures how much vertical room is left between the element's top and the
 * bottom of the viewport, so the list can fill the page exactly on any screen.
 * Returns null while the space is too small to be worth constraining (mobile
 * landscape / tiny windows) — the caller then falls back to natural flow.
 */
function useAvailableHeight(el: HTMLElement | null) {
  const [height, setHeight] = useState<number | null>(null)

  const measure = useCallback(() => {
    if (!el) return
    const free = window.innerHeight - el.getBoundingClientRect().top - BOTTOM_GAP
    setHeight(free >= MIN_LIST_H ? Math.floor(free) : null)
  }, [el])

  useLayoutEffect(() => {
    if (!el) return
    window.addEventListener('resize', measure)
    // The header above can wrap onto another line, which moves our top edge.
    const ro = new ResizeObserver(measure)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [el, measure])

  return height
}

/** Live content height of an element, used to work out how many rows fit. */
function useElementHeight(el: HTMLElement | null) {
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (!el) return
    // ResizeObserver reports the initial size on observe(), so no manual read.
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])

  return height
}

function PagerButton({
  onClick,
  disabled,
  label,
  back,
  arrowLeft,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  /** previous = icon before the label; next = icon after it */
  back: boolean
  /** arrow shape, already resolved for the writing direction */
  arrowLeft: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-lake-950 shadow-soft transition-colors hover:bg-lake-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-3.5 w-3.5 ${back ? '' : 'order-1'}`}
        aria-hidden
      >
        <path d={arrowLeft ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
      {label}
    </button>
  )
}

export function AdminOrders() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const rtl = i18n.dir() === 'rtl'
  const toast = useToast((s) => s.show)

  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<Order['status'] | ''>('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [sectionEl, setSectionEl] = useState<HTMLDivElement | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const sectionHeight = useAvailableHeight(sectionEl)
  const rowSpace = useElementHeight(scrollEl)

  useEffect(
    () =>
      adminSubscribeOrders(
        (next) => {
          setError(null)
          setOrders(next)
        },
        (err) => setError(loadErrorKey(err)),
      ),
    [attempt],
  )

  const filtered = useMemo(
    () => orders?.filter((o) => !filter || o.status === filter) ?? null,
    [orders, filter],
  )

  const perPage = rowSpace ? Math.max(3, Math.floor(rowSpace / ROW_H)) : 6
  const total = filtered?.length ?? 0
  const pages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, pages)
  const start = (current - 1) * perPage
  const visible = useMemo(
    () => filtered?.slice(start, start + perPage) ?? null,
    [filtered, start, perPage],
  )

  function goTo(next: number) {
    setPage(next)
    setOpenId(null)
    scrollEl?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function changeStatus(order: Order, status: Order['status']) {
    if (status === order.status) return
    setUpdating(order.id)
    try {
      await adminUpdateOrderStatus(order.id, status)
      toast(t('admin.orders.statusUpdated'))
    } catch (err) {
      toast(t(errorKey(err, 'admin.orders.updateError')))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t('admin.orders.title')}</PageTitle>
        <div className="flex flex-wrap gap-2">
          {(['', ...ORDER_STATUSES] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setFilter(s)
                setPage(1)
                setOpenId(null)
              }}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-lake-900 text-cream'
                  : 'bg-white text-lake-950 shadow-soft hover:bg-lake-50'
              }`}
            >
              {s ? t(`admin.status.${s}`) : t('admin.orders.all')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          <span>{t(error)}</span>
          <button
            onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}
            className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-medium text-red-600 shadow-soft hover:bg-red-100"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!filtered ? (
        !error && (
          <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
        )
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">
            {filter ? t('admin.orders.emptyFilter') : t('admin.orders.empty')}
          </p>
        </div>
      ) : (
        <div
          ref={setSectionEl}
          style={sectionHeight ? { height: sectionHeight } : undefined}
          className="flex flex-col gap-3"
        >
          <div
            ref={setScrollEl}
            className="admin-scroll -mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-1"
          >
            {visible!.map((order) => {
              const open = openId === order.id
              return (
                <div key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-soft">
                  {/* Summary row */}
                  <button
                    onClick={(e) => {
                      setOpenId(open ? null : order.id)
                      if (open) return
                      const row = e.currentTarget.parentElement
                      // Wait for the expand animation before pulling it into view.
                      setTimeout(() => row?.scrollIntoView({ block: 'nearest' }), 280)
                    }}
                    className="grid w-full cursor-pointer grid-cols-2 items-center gap-x-4 gap-y-1 px-5 py-4 text-start transition-colors hover:bg-lake-50/50 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-lake-950">
                        {order.customer_name}
                      </span>
                      <span className="block text-xs text-stone-soft">
                        {order.city} · {formatOrderDate(order.created_at, lang)}
                      </span>
                    </span>
                    <span className="text-xs text-stone-soft" dir="ltr">
                      {order.phone}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap text-lake-900">
                      {formatPrice(order.total, lang)}
                    </span>
                    <StatusBadge status={order.status} />
                  </button>

                  {/* Details */}
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="grid grid-cols-1 gap-6 border-t border-lake-900/10 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                          {/* Items */}
                          <div>
                            <h3 className="mb-3 text-sm font-semibold text-lake-950">
                              {t('admin.orders.items')}
                            </h3>
                            <ul className="space-y-2">
                              {order.items.map((item, i) => (
                                <li
                                  key={`${item.product_id}-${i}`}
                                  className="flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-2.5 text-sm"
                                >
                                  <span className="min-w-0 truncate">
                                    {lang === 'ar' ? item.name_ar : item.name_en}
                                    <span className="ms-2 text-xs text-stone-soft">
                                      × {item.quantity}
                                    </span>
                                  </span>
                                  <span className="font-medium whitespace-nowrap">
                                    {formatPrice(item.price * item.quantity, lang)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <dl className="mt-4 space-y-1.5 border-t border-lake-900/10 pt-3 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-stone-soft">{t('admin.orders.subtotal')}</dt>
                                <dd>{formatPrice(order.subtotal, lang)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-stone-soft">{t('admin.orders.shipping')}</dt>
                                <dd>
                                  {order.shipping === 0
                                    ? t('admin.orders.free')
                                    : formatPrice(order.shipping, lang)}
                                </dd>
                              </div>
                              <div className="flex justify-between font-semibold text-lake-950">
                                <dt>{t('admin.orders.total')}</dt>
                                <dd>{formatPrice(order.total, lang)}</dd>
                              </div>
                              <p className="pt-1 text-xs text-gold">{t('admin.orders.cod')}</p>
                            </dl>
                          </div>

                          {/* Customer + status */}
                          <div className="space-y-4">
                            <dl className="space-y-2.5 rounded-xl bg-cream px-4 py-4 text-sm">
                              <div>
                                <dt className="text-xs text-stone-soft">
                                  {t('admin.orders.phone')}
                                </dt>
                                <dd className="font-medium" dir="ltr">
                                  {order.phone}
                                </dd>
                              </div>
                              {order.email && (
                                <div>
                                  <dt className="text-xs text-stone-soft">
                                    {t('admin.orders.email')}
                                  </dt>
                                  <dd className="font-medium break-all" dir="ltr">
                                    {order.email}
                                  </dd>
                                </div>
                              )}
                              <div>
                                <dt className="text-xs text-stone-soft">
                                  {t('admin.orders.address')}
                                </dt>
                                <dd className="font-medium">
                                  {order.address} — {order.city}
                                </dd>
                              </div>
                              {order.notes && (
                                <div>
                                  <dt className="text-xs text-stone-soft">
                                    {t('admin.orders.notes')}
                                  </dt>
                                  <dd>{order.notes}</dd>
                                </div>
                              )}
                            </dl>

                            <div>
                              <label
                                htmlFor={`status-${order.id}`}
                                className="mb-1.5 block text-xs font-medium text-stone-soft"
                              >
                                {t('admin.orders.status')}
                              </label>
                              <select
                                id={`status-${order.id}`}
                                value={order.status}
                                disabled={updating === order.id}
                                onChange={(e) =>
                                  void changeStatus(order, e.target.value as Order['status'])
                                }
                                className={adminSelect}
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {t(`admin.status.${s}`)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {pages > 1 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone-soft">
                {t('admin.orders.showing', {
                  from: start + 1,
                  to: start + visible!.length,
                  count: total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <PagerButton
                  back
                  arrowLeft={!rtl}
                  disabled={current === 1}
                  onClick={() => goTo(current - 1)}
                  label={t('admin.orders.prev')}
                />
                <span className="px-1 text-xs font-medium text-lake-950">
                  {t('admin.orders.pageOf', { page: current, pages })}
                </span>
                <PagerButton
                  back={false}
                  arrowLeft={rtl}
                  disabled={current === pages}
                  onClick={() => goTo(current + 1)}
                  label={t('admin.orders.next')}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
