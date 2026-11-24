import { useEffect, useState } from 'react'
import { errorKey } from '../../lib/errors'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../../lib/types'
import { adminDeleteProduct, adminFetchProducts, adminUpdateProduct } from '../../lib/admin-api'
import { formatPrice } from '../../lib/format'
import { categoryLabel, refreshCatalog, useCategories } from '../../store/catalog'
import { useToast } from '../../components/ui/toastStore'
import { confirmDialog } from '../../components/ui/confirmStore'
import { LinkButton } from '../../components/ui/Button'
import { EditIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon } from '../../components/ui/Icons'
import { PageTitle } from './ui'


export function AdminProducts() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const toast = useToast((s) => s.show)
  const categories = useCategories()

  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    adminFetchProducts().then(setProducts).catch((err) => setError(errorKey(err, 'admin.products.loadError')))
  }, [])

  async function onDelete(product: Product) {
    const ok = await confirmDialog({ message: t('admin.products.deleteConfirm'), danger: true })
    if (!ok) return
    setDeleting(product.id)
    try {
      await adminDeleteProduct(product.id)
      setProducts((prev) => prev?.filter((p) => p.id !== product.id) ?? null)
      refreshCatalog()
      toast(t('admin.products.deleted'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setDeleting(null)
    }
  }

  async function onToggleActive(product: Product) {
    setToggling(product.id)
    try {
      const is_active = !product.is_active
      await adminUpdateProduct(product.id, { is_active })
      setProducts((prev) => prev?.map((p) => (p.id === product.id ? { ...p, is_active } : p)) ?? null)
      refreshCatalog()
      toast(is_active ? t('admin.products.activated') : t('admin.products.deactivated'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t('admin.products.title')}</PageTitle>
        <LinkButton to="/admin/products/new" className="!px-5 !py-2.5">
          <PlusIcon className="h-4 w-4" />
          {t('admin.products.add')}
        </LinkButton>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {t(error)}
        </p>
      ) : !products ? (
        <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">{t('admin.products.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-lake-900/10 text-xs text-stone-soft">
                <th className="px-5 py-4 text-start font-medium">{t('admin.products.product')}</th>
                <th className="px-4 py-4 text-start font-medium">{t('admin.products.category')}</th>
                <th className="px-4 py-4 text-start font-medium">{t('admin.products.price')}</th>
                <th className="px-4 py-4 text-start font-medium">{t('admin.products.stock')}</th>
                <th className="px-4 py-4 text-start font-medium">{t('admin.products.featured')}</th>
                <th className="px-4 py-4 text-start font-medium">{t('admin.products.status')}</th>
                <th className="sticky end-0 bg-white px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-lake-900/5 last:border-0 ${p.is_active === false ? 'opacity-50' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="h-12 w-12 shrink-0 rounded-lg bg-cream-dark" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-lake-950">
                          {lang === 'ar' ? p.name_ar : p.name_en}
                        </p>
                        <p className="truncate text-xs text-stone-soft" dir="ltr">
                          {p.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {categoryLabel(p.category, lang, categories)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.sale_price ? (
                      <>
                        <span className="font-medium text-lake-900">
                          {formatPrice(p.sale_price, lang)}
                        </span>{' '}
                        <span className="text-xs text-stone-soft line-through">
                          {formatPrice(p.price, lang)}
                        </span>
                      </>
                    ) : (
                      formatPrice(p.price, lang)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.stock === 0 ? 'font-medium text-red-500' : ''}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">{p.is_featured ? '★' : ''}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void onToggleActive(p)}
                      disabled={toggling === p.id}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
                        p.is_active === false
                          ? 'bg-stone-soft/15 text-stone-soft hover:bg-stone-soft/25'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {p.is_active === false ? (
                        <EyeOffIcon className="h-3.5 w-3.5" />
                      ) : (
                        <EyeIcon className="h-3.5 w-3.5" />
                      )}
                      {p.is_active === false ? t('admin.products.hidden') : t('admin.products.visible')}
                    </button>
                  </td>
                  <td className={`sticky end-0 px-5 py-3 ${p.is_active === false ? 'bg-white/60' : 'bg-white'}`}>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        aria-label={t('admin.products.edit')}
                        className="rounded-full p-2 text-lake-700 hover:bg-lake-50"
                      >
                        <EditIcon className="h-4.5 w-4.5" />
                      </Link>
                      <button
                        onClick={() => void onDelete(p)}
                        disabled={deleting === p.id}
                        aria-label={t('cart.remove')}
                        className="cursor-pointer rounded-full p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <TrashIcon className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
