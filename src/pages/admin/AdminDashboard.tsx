import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Order, Product } from '../../lib/types'
import { adminFetchProducts, adminSubscribeOrders, loadErrorKey } from '../../lib/admin-api'
import { formatPrice } from '../../lib/format'
import { BoxIcon, ClipboardIcon, WalletIcon } from '../../components/ui/Icons'
import { PageTitle, StatusBadge } from './ui'
import { formatOrderDate } from './styles'

export function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = adminSubscribeOrders(setOrders, (err) => setError(loadErrorKey(err)))
    adminFetchProducts()
      .then(setProducts)
      .catch((err) => setError(loadErrorKey(err)))
    return unsub
  }, [])

  const topSellers = [...(products ?? [])]
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5)
    .filter((p) => p.sales_count > 0)

  const pending = orders?.filter((o) => o.status === 'pending').length ?? 0
  const revenue =
    orders?.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0) ?? 0

  const stats = [
    { icon: ClipboardIcon, label: t('admin.dashboard.totalOrders'), value: orders ? String(orders.length) : '—', hint: `${t('admin.dashboard.newOrders')}: ${pending}` },
    { icon: WalletIcon, label: t('admin.dashboard.revenue'), value: orders ? formatPrice(revenue, lang) : '—', hint: t('admin.dashboard.revenueHint') },
    { icon: BoxIcon, label: t('admin.dashboard.products'), value: products ? String(products.length) : '—', hint: '' },
  ]

  return (
    <div className="space-y-8">
      <PageTitle>{t('admin.dashboard.title')}</PageTitle>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{t(error)}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl bg-white p-6 shadow-soft">
            <span className="mb-4 inline-block rounded-full bg-lake-50 p-3 text-lake-700">
              <Icon className="h-6 w-6" />
            </span>
            <p className="text-sm text-stone-soft">{label}</p>
            <p className="font-display mt-1 text-3xl text-lake-950">{value}</p>
            {hint && <p className="mt-1 text-xs text-stone-soft">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl text-lake-950">{t('admin.dashboard.recentOrders')}</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-lake-700 hover:text-lake-900">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>

          {!orders ? (
            <p className="py-8 text-center text-sm text-stone-soft">{error ? '—' : t('common.loading')}</p>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-soft">{t('admin.orders.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lake-900/10 text-start text-xs text-stone-soft">
                    <th className="pb-3 pe-4 text-start font-medium">{t('admin.orders.customer')}</th>
                    <th className="pb-3 pe-4 text-start font-medium">{t('admin.orders.city')}</th>
                    <th className="pb-3 pe-4 text-start font-medium">{t('admin.orders.date')}</th>
                    <th className="pb-3 pe-4 text-start font-medium">{t('admin.orders.total')}</th>
                    <th className="pb-3 text-start font-medium">{t('admin.orders.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr key={o.id} className="border-b border-lake-900/5 last:border-0">
                      <td className="py-3 pe-4 font-medium text-lake-950">{o.customer_name}</td>
                      <td className="py-3 pe-4">{o.city}</td>
                      <td className="py-3 pe-4 whitespace-nowrap text-stone-soft">
                        {formatOrderDate(o.created_at, lang)}
                      </td>
                      <td className="py-3 pe-4 whitespace-nowrap">{formatPrice(o.total, lang)}</td>
                      <td className="py-3">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('admin.dashboard.topSelling')}</h2>
          {!products ? (
            <p className="py-8 text-center text-sm text-stone-soft">{error ? '—' : t('common.loading')}</p>
          ) : topSellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-soft">{t('admin.dashboard.noSalesYet')}</p>
          ) : (
            <ul className="space-y-3">
              {topSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="font-display w-5 shrink-0 text-sm text-stone-soft">{i + 1}</span>
                  {p.images[0] ? (
                    <img src={p.images[0]} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-lg bg-cream-dark" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-lake-950">
                    {lang === 'ar' ? p.name_ar : p.name_en}
                  </span>
                  <span className="shrink-0 rounded-full bg-lake-50 px-2.5 py-1 text-xs font-medium text-lake-700">
                    {p.sales_count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
