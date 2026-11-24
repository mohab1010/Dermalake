import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ensureAuthListener, useAuth } from '../../store/auth'
import {
  BoxIcon,
  ClipboardIcon,
  GiftIcon,
  GlobeIcon,
  GridIcon,
  ImageIcon,
  LogoutIcon,
  StarIcon,
  TagIcon,
} from '../../components/ui/Icons'

const NAV = [
  { to: '/admin', end: true, icon: GridIcon, key: 'dashboard' },
  { to: '/admin/orders', end: false, icon: ClipboardIcon, key: 'orders' },
  { to: '/admin/products', end: false, icon: BoxIcon, key: 'products' },
  { to: '/admin/categories', end: false, icon: TagIcon, key: 'categories' },
  { to: '/admin/home', end: false, icon: ImageIcon, key: 'home' },
  { to: '/admin/offers', end: false, icon: GiftIcon, key: 'offers' },
  { to: '/admin/reviews', end: false, icon: StarIcon, key: 'reviews' },
] as const

export function AdminLayout() {
  const { t, i18n } = useTranslation()
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  const logout = useAuth((s) => s.logout)

  ensureAuthListener()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-sm text-stone-soft">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-lake-900 text-cream' : 'text-lake-950 hover:bg-lake-50'
    }`

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      {/* Sidebar */}
      <aside className="shrink-0 border-b border-lake-900/10 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-e lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-5 lg:block">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 40 40" className="h-9 w-9 text-lake-900" fill="none">
              <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 22c3.5-2.5 6-6 12-6s8.5 3.5 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 27c2.8-1.8 4.8-4 9-4s6.2 2.2 9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
              <circle cx="20" cy="11.5" r="2.2" fill="currentColor" />
            </svg>
            <span className="font-display text-sm tracking-wide text-lake-950">
              {t('admin.brand')}
            </span>
          </div>
          <p className="hidden truncate text-xs text-stone-soft lg:mt-2 lg:block" dir="ltr">
            {user.email}
          </p>
          <button
            onClick={() => void logout()}
            aria-label={t('admin.nav.logout')}
            className="cursor-pointer rounded-full p-2 text-red-600 hover:bg-red-50 lg:hidden"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map(({ to, end, icon: Icon, key }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{t(`admin.nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden px-3 pt-6 lg:block">
          <div className="space-y-1 border-t border-lake-900/10 pt-4">
            <NavLink to="/" className={() => linkClass({ isActive: false })}>
              <GlobeIcon className="h-5 w-5" />
              {t('admin.nav.viewStore')}
            </NavLink>
            <button
              onClick={() => {
                void i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-lake-950 hover:bg-lake-50"
            >
              <span className="text-base leading-none">{i18n.language === 'ar' ? 'EN' : 'ع'}</span>
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </button>
            <button
              onClick={() => void logout()}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogoutIcon className="h-5 w-5" />
              {t('admin.nav.logout')}
            </button>
          </div>
        </div>

      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
