import { useTranslation } from 'react-i18next'
import type { Review } from '../../lib/types'
import { StarIcon } from '../ui/Icons'
import { RatingStars } from './RatingStars'

interface RatingSummary {
  /** counts[0] = 1-star … counts[4] = 5-star */
  counts: number[]
  total: number
  average: number
}

function summarizeRatings(reviews: Review[]): RatingSummary {
  const counts = [0, 0, 0, 0, 0]
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)))
    counts[star - 1]++
  }
  const total = reviews.length
  const average = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
  return { counts, total, average }
}

/** Average + 5→1 star distribution bars, computed live from the given reviews. */
export function RatingBreakdown({ reviews, className = '' }: { reviews: Review[]; className?: string }) {
  const { t, i18n } = useTranslation()
  const { counts, total, average } = summarizeRatings(reviews)
  if (total === 0) return null

  const fmt = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-EG')

  return (
    <div className={`rounded-2xl bg-white p-6 shadow-soft ${className}`}>
      <div className="flex items-center gap-6 sm:gap-8">
        <div className="shrink-0 text-center">
          <p className="font-display text-5xl leading-none text-lake-950">{average.toFixed(1)}</p>
          <RatingStars rating={average} className="mt-2" starClass="w-3.5 h-3.5" />
          <p className="mt-1.5 text-xs text-stone-soft">
            {t('product.reviewsCount', { count: total })}
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star - 1]
            const pct = (count / total) * 100
            return (
              <div
                key={star}
                className="flex items-center gap-2.5"
                title={`${fmt.format(count)} × ${fmt.format(star)}★`}
              >
                <span className="flex w-8 shrink-0 items-center justify-end gap-1 text-xs text-charcoal/70">
                  {fmt.format(star)}
                  <StarIcon className="h-3 w-3 text-gold" />
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-cream-dark">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-xs text-stone-soft">{fmt.format(count)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
