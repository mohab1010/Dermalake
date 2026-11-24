import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Review } from '../../lib/types'
import { fetchReviews, submitReview } from '../../lib/api'
import { useToast } from '../ui/toastStore'
import { Button } from '../ui/Button'
import { RatingInput, RatingStars } from './RatingStars'
import { RatingBreakdown } from './RatingBreakdown'

interface ReviewSectionProps {
  productId: string
  onReviewSubmitted?: (rating: number, reviewsCount: number) => void
}

export function ReviewSection({ productId, onReviewSubmitted }: ReviewSectionProps) {
  const { t, i18n } = useTranslation()
  const showToast = useToast((s) => s.show)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [reviewsError, setReviewsError] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchReviews(productId)
      .then((r) => {
        if (!cancelled) setReviews(r)
      })
      .catch(() => {
        if (!cancelled) setReviewsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !comment.trim()) return
    setSubmitting(true)
    try {
      const result = await submitReview({
        product_id: productId,
        author_name: name.trim(),
        rating,
        comment: comment.trim(),
      })
      setReviews((prev) => [result.review, ...(prev ?? [])])
      onReviewSubmitted?.(result.rating, result.reviews_count)
      setName('')
      setComment('')
      setRating(5)
      showToast(t('product.reviewSubmitted'))
    } catch {
      showToast(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div>
        <h2 className="font-display mb-6 text-2xl text-lake-950">
          {t('product.reviews')}
          {reviews && (
            <span className="ms-3 text-sm font-normal text-stone-soft">
              {t('product.reviewsCount', { count: reviews.length })}
            </span>
          )}
        </h2>

        {reviewsError ? (
          <p className="text-sm text-stone-soft">{t('common.error')}</p>
        ) : !reviews ? (
          <p className="text-sm text-stone-soft">{t('common.loading')}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-stone-soft">{t('product.noReviews')}</p>
        ) : (
          <>
          <RatingBreakdown reviews={reviews} className="mb-6" />
          <ul className="space-y-5">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-white p-5 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-lake-950">{review.author_name}</span>
                  <RatingStars rating={review.rating} starClass="w-3.5 h-3.5" />
                </div>
                <p className="text-sm leading-relaxed text-charcoal/80">{review.comment}</p>
                <p className="mt-2 text-xs text-stone-soft">
                  {new Date(review.created_at).toLocaleDateString(
                    i18n.language === 'ar' ? 'ar-EG' : 'en-GB',
                  )}
                </p>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      <div>
        <h2 className="font-display mb-6 text-2xl text-lake-950">{t('product.writeReview')}</h2>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-soft">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('product.yourRating')}</label>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <label htmlFor="review-name" className="mb-1.5 block text-sm font-medium">
              {t('product.yourName')}
            </label>
            <input
              id="review-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              className="w-full rounded-xl border border-lake-900/15 bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-lake-500"
            />
          </div>
          <div>
            <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium">
              {t('product.yourComment')}
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={1000}
              rows={4}
              className="w-full resize-none rounded-xl border border-lake-900/15 bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-lake-500"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('common.loading') : t('product.submitReview')}
          </Button>
        </form>
      </div>
    </section>
  )
}
