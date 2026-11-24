import { useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Logo } from './Logo'
import { useCart, cartCount } from '../../store/cart'
import { useWishlist } from '../../store/wishlist'
import { CartIcon, CloseIcon, GlobeIcon, HeartIcon, MenuIcon, SearchIcon } from '../ui/Icons'

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute -top-1.5 -end-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const wishlistIds = useWishlist((s) => s.ids)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm tracking-wide transition-colors hover:text-lake-700 ${
      isActive ? 'text-lake-900 font-semibold' : 'text-charcoal/70'
    }`

  function toggleLang() {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    const q = search.trim()
    setMenuOpen(false)
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
  }

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-lake-900/8 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="cursor-pointer p-1 text-lake-900 lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="menu"
        >
          <MenuIcon />
        </button>

        <Logo />

        <nav className="ms-8 hidden items-center gap-7 lg:flex">
          <NavLink to="/" className={navLinkClass} end>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/shop" className={navLinkClass}>
            {t('nav.shop')}
          </NavLink>
          <NavLink to="/#story" className={() => navLinkClass({ isActive: false })}>
            {t('nav.about')}
          </NavLink>
        </nav>

        <form onSubmit={submitSearch} className="ms-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full rounded-full border border-lake-900/15 bg-white/70 py-2.5 ps-4 pe-10 text-sm outline-none transition-colors placeholder:text-stone-soft/70 focus:border-lake-500"
            />
            <button
              type="submit"
              className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone-soft hover:text-lake-900"
              aria-label="search"
            >
              <SearchIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:ms-0">
          <button
            type="button"
            onClick={toggleLang}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-2 text-sm sm:px-3 text-lake-900 transition-colors hover:bg-lake-50"
            aria-label="switch language"
          >
            <GlobeIcon className="hidden h-4.5 w-4.5 min-[360px]:block" />
            <span className="font-medium">{i18n.language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          <Link
            to="/wishlist"
            className="relative rounded-full p-2 text-lake-900 sm:p-2.5 transition-colors hover:bg-lake-50"
            aria-label={t('nav.wishlist')}
          >
            <HeartIcon />
            <CountBadge count={wishlistIds.length} />
          </Link>

          <Link
            to="/cart"
            className="relative rounded-full p-2 text-lake-900 sm:p-2.5 transition-colors hover:bg-lake-50"
            aria-label={t('nav.cart')}
          >
            <CartIcon />
            <CountBadge count={cartCount(items)} />
          </Link>
        </div>
      </div>
    </header>

    {/* mobile menu — rendered outside <header>: its backdrop-blur makes it the
        containing block for fixed elements, which would clip the drawer */}
    <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-lake-950/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 start-0 z-50 flex w-72 flex-col gap-6 bg-cream p-6 shadow-lift lg:hidden"
              initial={{ x: document.dir === 'rtl' ? 288 : -288 }}
              animate={{ x: 0 }}
              exit={{ x: document.dir === 'rtl' ? 288 : -288 }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  className="cursor-pointer p-1 text-lake-900"
                  onClick={() => setMenuOpen(false)}
                  aria-label="close"
                >
                  <CloseIcon />
                </button>
              </div>

              <form onSubmit={submitSearch}>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('nav.searchPlaceholder')}
                    className="w-full rounded-full border border-lake-900/15 bg-white py-2.5 ps-4 pe-10 text-sm outline-none focus:border-lake-500"
                  />
                  <button type="submit" className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone-soft" aria-label="search">
                    <SearchIcon className="h-4.5 w-4.5" />
                  </button>
                </div>
              </form>

              <nav className="flex flex-col gap-4 text-lg">
                <Link to="/" onClick={() => setMenuOpen(false)}>{t('nav.home')}</Link>
                <Link to="/shop" onClick={() => setMenuOpen(false)}>{t('nav.shop')}</Link>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)}>{t('nav.wishlist')}</Link>
                <Link to="/cart" onClick={() => setMenuOpen(false)}>{t('nav.cart')}</Link>
              </nav>
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  )
}
