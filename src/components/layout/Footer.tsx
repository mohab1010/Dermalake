import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from './Logo'
import { categoryLabel, useCategories } from '../../store/catalog'

export function Footer() {
  const { t, i18n } = useTranslation()
  const categories = useCategories()
  const [subscribed, setSubscribed] = useState(false)
  const [email, setEmail] = useState('')

  function subscribe(e: FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubscribed(true)
  }

  return (
    <footer className="mt-24 bg-lake-950 text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed">{t('footer.about')}</p>
        </div>

        <div>
          <h3 className="font-display mb-4 text-sm tracking-[0.18em] text-gold-light uppercase">
            {t('footer.shop')}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {(categories ?? []).slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to={`/shop?category=${c.slug}`} className="transition-colors hover:text-cream">
                  {categoryLabel(c.slug, i18n.language, categories)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display mb-4 text-sm tracking-[0.18em] text-gold-light uppercase">
            {t('footer.help')}
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li><span className="cursor-default">{t('footer.contact')}</span></li>
            <li><span className="cursor-default">{t('footer.shippingPolicy')}</span></li>
            <li><span className="cursor-default">{t('footer.returns')}</span></li>
            <li><span className="cursor-default">{t('footer.faq')}</span></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display mb-4 text-sm tracking-[0.18em] text-gold-light uppercase">
            {t('footer.newsletterTitle')}
          </h3>
          <p className="mb-4 text-sm">{t('footer.newsletterText')}</p>
          {subscribed ? (
            <p className="text-sm font-medium text-gold-light">{t('footer.subscribed')}</p>
          ) : (
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.newsletterPlaceholder')}
                className="min-w-0 flex-1 rounded-full border border-cream/20 bg-cream/10 px-4 py-2.5 text-sm text-cream outline-none placeholder:text-cream/40 focus:border-gold-light"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold-light"
              >
                {t('footer.subscribe')}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} Dermalake — {t('footer.rights')}
      </div>
    </footer>
  )
}
