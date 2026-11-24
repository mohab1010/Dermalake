import { useTranslation } from 'react-i18next'
import { LinkButton } from '../components/ui/Button'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-28 text-center">
      <p className="font-display text-7xl text-lake-300">404</p>
      <h1 className="font-display text-3xl text-lake-950">{t('notFound.title')}</h1>
      <p className="text-stone-soft">{t('notFound.text')}</p>
      <LinkButton to="/">{t('notFound.back')}</LinkButton>
    </div>
  )
}
