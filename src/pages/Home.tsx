import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { HomeSlide, Product } from '../lib/types'
import { fetchHomeSlides, fetchProducts } from '../lib/api'
import { categoryLabel, useCategories } from '../store/catalog'
import { ProductCard } from '../components/product/ProductCard'
import { GridSkeleton } from '../components/ui/Skeleton'
import { LinkButton } from '../components/ui/Button'
import { ArrowIcon, ChatIcon, ShieldIcon, TruckIcon, WalletIcon } from '../components/ui/Icons'
import heroImage from '../assets/home-page/hero-cozy-ritual.jpg'

const STORY_IMAGE =
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=80'

interface MagazineCardProps {
  image: string
  tag: string
  title: string
  text: string
  cta: string
  link: string
  className?: string
}

function MagazineCard({ image, tag, title, text, cta, link, className = '' }: MagazineCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className={`group relative min-h-[420px] overflow-hidden rounded-[2rem] shadow-lift ${className}`}
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-lake-950/85 via-lake-950/25 to-transparent" />
      <span className="absolute start-5 top-5 rounded-full bg-cream/90 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-lake-900 uppercase backdrop-blur">
        {tag}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <h3 className="font-display text-2xl text-cream sm:text-3xl">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream/80">{text}</p>
        <Link
          to={link}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-light transition-colors hover:text-cream"
        >
          {cta}
          <ArrowIcon className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  )
}

export function Home() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [featured, setFeatured] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [slides, setSlides] = useState<HomeSlide[]>([])
  const categories = useCategories()
  // only show categories that have an image so the grid stays tidy
  const tiles = (categories ?? []).filter((c) => c.image).slice(0, 6)

  useEffect(() => {
    fetchProducts()
      .then((products) => {
        // Best sellers, ranked by real orders — newest products break ties
        // so the section isn't empty before the store has any sales yet.
        const ranked = [...products].sort(
          (a, b) => b.sales_count - a.sales_count || b.created_at - a.created_at,
        )
        setFeatured(ranked.slice(0, 8))
      })
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    // falls back to the bundled campaign cards when the admin hasn't set any
    fetchHomeSlides().then(setSlides).catch(() => setSlides([]))
  }, [])

  const perks = [
    { icon: TruckIcon, title: t('home.perks.shipping'), text: t('home.perks.shippingText') },
    { icon: ShieldIcon, title: t('home.perks.authentic'), text: t('home.perks.authenticText') },
    { icon: WalletIcon, title: t('home.perks.cod'), text: t('home.perks.codText') },
    { icon: ChatIcon, title: t('home.perks.support'), text: t('home.perks.supportText') },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <p className="mb-4 text-sm font-medium tracking-[0.22em] text-gold uppercase">
              {t('hero.eyebrow')}
            </p>
            <h1 className="font-display text-4xl leading-[1.15] text-lake-950 sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-stone-soft sm:text-lg">
              {t('hero.subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton to="/shop" className="px-8">
                {t('hero.cta')}
                <ArrowIcon className="h-4 w-4" />
              </LinkButton>
              <LinkButton to="/shop?sort=sales" variant="outline" className="px-8">
                {t('hero.secondary')}
              </LinkButton>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[2rem] shadow-lift">
              <img
                src={heroImage}
                alt="Dermalake skincare"
                fetchPriority="high"
                decoding="async"
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -start-5 hidden rounded-2xl bg-white px-6 py-4 shadow-lift sm:block">
              <p className="font-display text-2xl text-lake-900">{t('hero.statNumber')}</p>
              <p className="text-xs text-stone-soft">{t('hero.statLabel')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display mb-8 text-center text-3xl text-lake-950">
          {t('home.categoriesTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link to={`/shop?category=${cat.slug}`} className="group block text-center">
                <div className="mb-3 overflow-hidden rounded-2xl">
                  <img
                    src={cat.image}
                    alt={categoryLabel(cat.slug, i18n.language, categories)}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <span className="text-sm font-medium text-lake-950 transition-colors group-hover:text-lake-700">
                  {categoryLabel(cat.slug, i18n.language, categories)}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Editorial / magazine — admin-managed in /admin/home */}
      {slides.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium tracking-[0.22em] text-gold uppercase">
            {t('home.editorial.eyebrow')}
          </p>
          <h2 className="font-display text-3xl text-lake-950 sm:text-4xl">
            {t('home.editorial.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-soft">
            {t('home.editorial.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {slides.map((slide, i) => (
            <MagazineCard
              key={slide.id}
              image={slide.image}
              tag={isAr ? slide.tag_ar : slide.tag_en}
              title={isAr ? slide.title_ar : slide.title_en}
              text={isAr ? slide.text_ar : slide.text_en}
              cta={t('home.editorial.shop')}
              link={slide.link || '/shop'}
              // first card runs as the tall feature, the rest stack beside it
              className={i === 0 ? 'lg:col-span-7 lg:row-span-2 lg:min-h-[560px]' : 'lg:col-span-5'}
            />
          ))}
        </div>
      </section>
      )}

      {/* Best sellers */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-lake-950">{t('home.featuredTitle')}</h2>
            <p className="mt-2 text-sm text-stone-soft">{t('home.featuredSubtitle')}</p>
          </div>
          <Link
            to="/shop"
            className="flex items-center gap-1.5 text-sm font-medium text-lake-700 hover:text-lake-900"
          >
            {t('home.viewAll')}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
        {loadError ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-stone-soft shadow-soft">
            {t('common.error')}
          </p>
        ) : !featured ? (
          <GridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Story */}
      <section id="story" className="bg-lake-50/60 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[2rem] shadow-lift"
          >
            <img src={STORY_IMAGE} alt="Dermalake ritual" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl text-lake-950 sm:text-4xl">{t('home.storyTitle')}</h2>
            <p className="mt-6 leading-relaxed text-stone-soft">{t('home.storyText')}</p>
            <div className="mt-8">
              <LinkButton to="/shop" variant="outline">
                {t('home.storyCta')}
                <ArrowIcon className="h-4 w-4" />
              </LinkButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="rounded-full bg-lake-50 p-4 text-lake-700">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="font-medium text-lake-950">{title}</h3>
              <p className="text-sm text-stone-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
