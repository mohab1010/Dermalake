import { useTranslation } from 'react-i18next'
import type { Order } from '../../lib/types'

const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'bg-gold/15 text-gold',
  confirmed: 'bg-lake-100 text-lake-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

export function StatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
    >
      {t(`admin.status.${status}`)}
    </span>
  )
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-3xl text-lake-950">{children}</h1>
}
