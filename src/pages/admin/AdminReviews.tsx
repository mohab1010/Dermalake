import { useEffect, useMemo, useState } from 'react'
import { errorKey } from '../../lib/errors'
import { useTranslation } from 'react-i18next'
import type { Product, Review } from '../../lib/types'
import { adminDeleteReview, adminFetchProducts, adminFetchReviews } from '../../lib/admin-api'
import { refreshCatalog } from '../../store/catalog'
import { useToast } from '../../components/ui/toastStore'
import { confirmDialog } from '../../components/ui/confirmStore'
import { TrashIcon } from '../../components/ui/Icons'
import { RatingStars } from '../../components/product/RatingStars'
import { RatingBreakdown } from '../../components/product/RatingBreakdown'
import { PageTitle } from './ui'
import { adminSelect } from './styles'

export function AdminReviews() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const toast = useToast((s) => s.show)

  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([adminFetchReviews(), adminFetchProducts()])
      .then(([r, p]) => {
        setReviews(r)
        setProducts(p)
      })
      .catch((err) => setError(errorKey(err, 'admin.reviews.loadError')))
  }, [])

  const productName = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) map.set(p.id, lang === 'ar' ? p.name_ar : p.name_en)
    return map
  }, [products, lang])

  const filtered = useMemo(
    () => (reviews ?? []).filter((r) => !filter || r.product_id === filter),
    [reviews, filter],
  )

  async function onDelete(review: Review) {
    const ok = await confirmDialog({ message: t('admin.reviews.deleteConfirm'), danger: true })
    if (!ok) return
    setDeleting(review.id)
    try {
      await adminDeleteReview(review)
      setReviews((prev) => prev?.filter((r) => r.id !== review.id) ?? null)
      // product rating/reviews_count changed — let the storefront refetch
      refreshCatalog()
      toast(t('admin.reviews.deleted'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t('admin.reviews.title')}</PageTitle>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`${adminSelect} !w-auto min-w-48`}
        >
          <option value="">{t('admin.reviews.allProducts')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {lang === 'ar' ? p.name_ar : p.name_en}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {t(error)}
        </p>
      ) : !reviews ? (
        <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">{t('admin.reviews.empty')}</p>
        </div>
      ) : (
        <>
          <RatingBreakdown reviews={filtered} className="max-w-xl" />

          <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-lake-900/10 text-xs text-stone-soft">
                  <th className="px-5 py-4 text-start font-medium">{t('admin.reviews.product')}</th>
                  <th className="px-4 py-4 text-start font-medium">{t('product.yourRating')}</th>
                  <th className="px-4 py-4 text-start font-medium">{t('admin.reviews.review')}</th>
                  <th className="px-4 py-4 text-start font-medium">{t('admin.reviews.date')}</th>
                  <th className="sticky end-0 bg-white px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-lake-900/5 align-top last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-lake-950">
                        {productName.get(r.product_id) ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <RatingStars rating={r.rating} starClass="w-3.5 h-3.5" />
                    </td>
                    <td className="max-w-md px-4 py-3.5">
                      <p className="font-medium text-lake-950">{r.author_name}</p>
                      <p className="mt-0.5 leading-relaxed text-charcoal/80">{r.comment}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap text-stone-soft">
                      {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                    </td>
                    <td className="sticky end-0 bg-white px-5 py-3.5">
                      <button
                        onClick={() => void onDelete(r)}
                        disabled={deleting === r.id}
                        aria-label={t('cart.remove')}
                        className="cursor-pointer rounded-full p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <TrashIcon className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
