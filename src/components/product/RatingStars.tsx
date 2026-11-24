import { StarIcon } from '../ui/Icons'

interface RatingStarsProps {
  rating: number
  className?: string
  starClass?: string
}

export function RatingStars({ rating, className = '', starClass = 'w-4 h-4' }: RatingStarsProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          filled={i <= Math.round(rating)}
          className={`${starClass} ${i <= Math.round(rating) ? 'text-gold' : 'text-sand'}`}
        />
      ))}
    </span>
  )
}

interface RatingInputProps {
  value: number
  onChange: (value: number) => void
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="cursor-pointer transition-transform hover:scale-110"
          aria-label={`${i} stars`}
        >
          <StarIcon filled={i <= value} className={`h-7 w-7 ${i <= value ? 'text-gold' : 'text-sand'}`} />
        </button>
      ))}
    </div>
  )
}
