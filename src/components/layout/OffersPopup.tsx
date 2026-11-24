import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchOffers } from '../../lib/api'
import type { Offer } from '../../lib/types'
import { ArrowIcon, CloseIcon, CheckIcon, CopyIcon, GiftIcon } from '../ui/Icons'

// The promo popup greets a visitor once per browser session. Closing it never
// throws the offers away — it collapses into a small handle on the right edge
// that reopens the popup on click.

const DISMISS_KEY = 'dermalake-offers-dismissed'
const OPEN_DELAY_MS = 1400

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // private mode — the popup just greets the visitor again next page load
  }
}

export function OffersPopup() {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'

  const [offers, setOffers] = useState<Offer[]>([])
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [index, setIndex] = useState(0)
  // holds the code that was just copied, so moving to another offer
  // automatically drops back to the "copy" label
  const [copiedCode, setCopiedCode] = useState('')

  useEffect(() => {
    let alive = true
    fetchOffers()
      .then((list) => {
        if (alive) setOffers(list)
      })
      .catch(() => {
        // offers are a bonus — never block the storefront on them
      })
    return () => {
      alive = false
    }
  }, [])

  // Warm the images up front so flipping between offers never shows a blank panel.
  useEffect(() => {
    for (const offer of offers) {
      if (offer.image) new Image().src = offer.image
    }
  }, [offers])

  // First visit of the session: greet after a short beat so the page paints first.
  useEffect(() => {
    if (dismissed || offers.length === 0) return
    const id = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
    return () => clearTimeout(id)
  }, [dismissed, offers.length])

  const close = useCallback(() => {
    setOpen(false)
    setDismissed(true)
    rememberDismissed()
  }, [])

  // Lock the page behind the dialog and wire up Escape.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  if (offers.length === 0) return null

  const offer = offers[Math.min(index, offers.length - 1)]
  const pick = (field: 'badge' | 'title' | 'text' | 'cta') =>
    (ar ? offer[`${field}_ar`] : offer[`${field}_en`])?.trim() ?? ''

  const go = (step: number) => setIndex((i) => (i + step + offers.length) % offers.length)

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 2000)
    } catch {
      // clipboard blocked (http / permissions) — the code is on screen anyway
    }
  }

  return (
    <>
      {/* Collapsed handle — stays on the right edge once the popup is closed */}
      <AnimatePresence>
        {!open && dismissed && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('offers.reopen')}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            className="group fixed top-28 right-0 z-30 flex cursor-pointer items-center gap-2 rounded-l-2xl bg-lake-900 py-3 pr-3 pl-3 text-cream shadow-lift transition-colors hover:bg-lake-700 sm:top-32"
          >
            <span className="relative flex">
              <GiftIcon className="h-5 w-5 text-gold-light" />
              <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-gold" />
              <span className="absolute -top-1 -left-1 h-2 w-2 animate-ping rounded-full bg-gold" />
            </span>
            <span className="max-w-0 overflow-hidden text-xs font-medium whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-28 group-hover:opacity-100">
              {t('offers.tab')}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* The popup itself */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={t('offers.title')}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-lake-950/50 px-4 py-8 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-cream shadow-lift"
            >
              <button
                type="button"
                onClick={close}
                aria-label={t('offers.close')}
                className="absolute end-4 top-4 z-10 cursor-pointer rounded-full bg-white/85 p-2 text-lake-950 shadow-soft backdrop-blur transition-colors hover:bg-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Image */}
                <div className="relative aspect-5/4 overflow-hidden bg-cream-dark md:aspect-auto md:min-h-104">
                  {/* the outgoing image stays mounted underneath so the panel
                      cross-fades instead of blinking empty */}
                  <AnimatePresence>
                    <motion.img
                      key={offer.id}
                      src={offer.image}
                      alt=""
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </AnimatePresence>
                </div>

                {/* Copy */}
                <div className="flex flex-col justify-center gap-4 p-7 text-center sm:p-9 md:text-start">
                  {pick('badge') && (
                    <span className="mx-auto inline-block rounded-full bg-gold/15 px-4 py-1.5 text-xs font-medium tracking-wide text-gold md:mx-0 md:self-start">
                      {pick('badge')}
                    </span>
                  )}

                  <h2 className="font-display text-3xl leading-tight text-lake-950 sm:text-4xl">
                    {pick('title')}
                  </h2>

                  {pick('text') && (
                    <p className="text-sm leading-relaxed text-stone-soft">{pick('text')}</p>
                  )}

                  {offer.code?.trim() && (
                    <button
                      type="button"
                      onClick={() => void copyCode(offer.code.trim())}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-lake-900/25 bg-white/70 px-4 py-3 transition-colors hover:border-lake-900/50"
                    >
                      <span className="flex flex-col items-start">
                        <span className="text-[0.7rem] text-stone-soft">{t('offers.codeLabel')}</span>
                        <span dir="ltr" className="font-display text-lg tracking-[0.15em] text-lake-950">
                          {offer.code.trim()}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-lake-700">
                        {copiedCode === offer.code.trim() ? (
                          <>
                            <CheckIcon className="h-4 w-4" />
                            {t('offers.copied')}
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-4 w-4" />
                            {t('offers.copy')}
                          </>
                        )}
                      </span>
                    </button>
                  )}

                  <div className="mt-1 flex flex-col items-center gap-3 md:items-start">
                    <Link
                      to={offer.link?.trim() || '/shop'}
                      onClick={close}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lake-900 px-6 py-3 text-sm font-medium tracking-wide text-cream transition-colors duration-200 hover:bg-lake-700 sm:w-auto"
                    >
                      {pick('cta') || t('offers.shopNow')}
                      <ArrowIcon className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={close}
                      className="cursor-pointer text-xs text-stone-soft underline-offset-4 transition-colors hover:text-lake-900 hover:underline"
                    >
                      {t('offers.dismiss')}
                    </button>
                  </div>

                  {/* Slider controls — only when the admin published more than one */}
                  {offers.length > 1 && (
                    <div className="mt-2 flex items-center justify-center gap-4 md:justify-start">
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label={t('offers.prev')}
                        className="cursor-pointer rounded-full border border-lake-900/15 p-2 text-lake-900 transition-colors hover:bg-lake-50"
                      >
                        <ArrowIcon className="h-4 w-4 rotate-180" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {offers.map((o, i) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={ar ? o.title_ar : o.title_en}
                            aria-current={i === index}
                            className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                              i === index ? 'w-6 bg-lake-900' : 'w-1.5 bg-lake-900/25 hover:bg-lake-900/50'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label={t('offers.next')}
                        className="cursor-pointer rounded-full border border-lake-900/15 p-2 text-lake-900 transition-colors hover:bg-lake-50"
                      >
                        <ArrowIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
