import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Logo({ light = false }: { light?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Dermalake home">
      <svg viewBox="0 0 40 40" className={`h-9 w-9 ${light ? 'text-gold-light' : 'text-lake-900'}`} fill="none">
        <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 22c3.5-2.5 6-6 12-6s8.5 3.5 12 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M11 27c2.8-1.8 4.8-4 9-4s6.2 2.2 9 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="20" cy="11.5" r="2.2" fill="currentColor" />
      </svg>
      <span
        className={`font-display text-xl tracking-[0.12em] uppercase ${light ? 'text-cream' : 'text-lake-950'}`}
      >
        {t('brand')}
      </span>
    </Link>
  )
}
