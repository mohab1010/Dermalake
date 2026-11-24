import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Offer } from '../../lib/types'
import {
  adminDeleteOffer,
  adminFetchOffers,
  adminSaveOffer,
  adminSetOfferActive,
  adminUploadImage,
  uploadErrorKey,
} from '../../lib/admin-api'
import { refreshCatalog } from '../../store/catalog'
import { useToast } from '../../components/ui/toastStore'
import { confirmDialog } from '../../components/ui/confirmStore'
import { Button } from '../../components/ui/Button'
import { EditIcon, EyeIcon, EyeOffIcon, PlusIcon, TrashIcon, UploadIcon } from '../../components/ui/Icons'
import { PageTitle } from './ui'
import { adminInput, adminInputError } from './styles'
import { errorKey } from '../../lib/errors'

interface FormState {
  image: string
  badge_ar: string
  badge_en: string
  title_ar: string
  title_en: string
  text_ar: string
  text_en: string
  code: string
  cta_ar: string
  cta_en: string
  link: string
  sort: string
}

const empty: FormState = {
  image: '',
  badge_ar: '',
  badge_en: '',
  title_ar: '',
  title_en: '',
  text_ar: '',
  text_en: '',
  code: '',
  cta_ar: '',
  cta_en: '',
  link: '/shop',
  sort: '',
}

export function AdminOffers() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const toast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)

  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    adminFetchOffers().then(setOffers).catch((err) => setError(errorKey(err, 'common.error')))
  }, [])

  function openNew() {
    setEditingId(null)
    setForm({ ...empty, sort: String((offers?.length ?? 0) + 1) })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(offer: Offer) {
    setEditingId(offer.id)
    setForm({
      image: offer.image ?? '',
      badge_ar: offer.badge_ar ?? '',
      badge_en: offer.badge_en ?? '',
      title_ar: offer.title_ar ?? '',
      title_en: offer.title_en ?? '',
      text_ar: offer.text_ar ?? '',
      text_en: offer.text_en ?? '',
      code: offer.code ?? '',
      cta_ar: offer.cta_ar ?? '',
      cta_en: offer.cta_en ?? '',
      link: offer.link ?? '/shop',
      sort: String(offer.sort ?? 0),
    })
    setErrors({})
    setShowForm(true)
  }

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function onUpload(file: File) {
    setUploading(true)
    try {
      const url = await adminUploadImage(file, 'offers')
      setForm((f) => ({ ...f, image: url }))
    } catch (err) {
      console.error('Offer image upload failed:', err)
      toast(t(uploadErrorKey(err)))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Partial<FormState> = {}
    if (!form.image.trim()) next.image = t('admin.form.required')
    if (!form.title_ar.trim()) next.title_ar = t('admin.form.required')
    if (!form.title_en.trim()) next.title_en = t('admin.form.required')
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const existing = editingId ? offers?.find((o) => o.id === editingId) : undefined
    try {
      await adminSaveOffer(
        {
          image: form.image.trim(),
          badge_ar: form.badge_ar.trim(),
          badge_en: form.badge_en.trim(),
          title_ar: form.title_ar.trim(),
          title_en: form.title_en.trim(),
          text_ar: form.text_ar.trim(),
          text_en: form.text_en.trim(),
          code: form.code.trim(),
          cta_ar: form.cta_ar.trim(),
          cta_en: form.cta_en.trim(),
          link: form.link.trim() || '/shop',
          sort: Number(form.sort) || 0,
          is_active: existing?.is_active ?? true,
        },
        editingId ?? undefined,
      )
      setOffers(await adminFetchOffers())
      refreshCatalog()
      toast(t('admin.offers.saved'))
      setShowForm(false)
    } catch (err) {
      toast(t(errorKey(err, 'admin.form.saveError')))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(offer: Offer) {
    const ok = await confirmDialog({ message: t('admin.offers.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await adminDeleteOffer(offer.id)
      setOffers((prev) => prev?.filter((o) => o.id !== offer.id) ?? null)
      refreshCatalog()
      toast(t('admin.offers.deleted'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    }
  }

  async function onToggleActive(offer: Offer) {
    setToggling(offer.id)
    try {
      const is_active = !(offer.is_active ?? true)
      await adminSetOfferActive(offer.id, is_active)
      setOffers((prev) => prev?.map((o) => (o.id === offer.id ? { ...o, is_active } : o)) ?? null)
      refreshCatalog()
      toast(is_active ? t('admin.offers.activated') : t('admin.offers.deactivated'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setToggling(null)
    }
  }

  const textField = (key: keyof FormState, label: string, dir: 'rtl' | 'ltr', hint?: string) => (
    <div>
      <label htmlFor={`of-${key}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`of-${key}`}
        dir={dir}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={`${adminInputError(errors[key])} ${dir === 'ltr' ? 'text-start' : ''}`}
      />
      {errors[key] ? (
        <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-stone-soft">{hint}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle>{t('admin.offers.title')}</PageTitle>
          <p className="mt-1 text-sm text-stone-soft">{t('admin.offers.subtitle')}</p>
        </div>
        <Button onClick={openNew} className="!px-5 !py-2.5">
          <PlusIcon className="h-4 w-4" />
          {t('admin.offers.add')}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{t(error)}</p>
      )}

      {/* Inline form */}
      {showForm && (
        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">
            {editingId ? t('admin.offers.edit') : t('admin.offers.add')}
          </h2>

          {/* Image */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">{t('admin.offers.image')}</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.image && (
                <img src={form.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="!px-5 !py-2.5"
              >
                <UploadIcon className="h-4 w-4" />
                {uploading ? t('admin.form.uploading') : t('admin.form.uploadImage')}
              </Button>
              <input
                dir="ltr"
                placeholder={t('admin.form.orUrl')}
                value={form.image}
                onChange={(e) => set('image', e.target.value)}
                className={`${adminInput} min-w-0 flex-1 text-start`}
              />
            </div>
            {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {textField('title_ar', t('admin.offers.titleAr'), 'rtl')}
            {textField('title_en', t('admin.offers.titleEn'), 'ltr')}
            {textField('badge_ar', t('admin.offers.badgeAr'), 'rtl', t('admin.offers.badgeHint'))}
            {textField('badge_en', t('admin.offers.badgeEn'), 'ltr')}
            {textField('text_ar', t('admin.offers.textAr'), 'rtl')}
            {textField('text_en', t('admin.offers.textEn'), 'ltr')}
            {textField('cta_ar', t('admin.offers.ctaAr'), 'rtl', t('admin.offers.ctaHint'))}
            {textField('cta_en', t('admin.offers.ctaEn'), 'ltr')}
            {textField('code', t('admin.offers.code'), 'ltr', t('admin.offers.codeHint'))}
            {textField('link', t('admin.offers.link'), 'ltr', t('admin.offers.linkHint'))}
            {textField('sort', t('admin.offers.sort'), 'ltr', t('admin.offers.sortHint'))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={saving || uploading} className="!px-6 !py-2.5">
              {saving ? t('admin.form.saving') : t('admin.form.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="!px-6 !py-2.5"
            >
              {t('admin.form.cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {error ? null : !offers ? (
        <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">{t('admin.offers.empty')}</p>
          <Button variant="outline" onClick={openNew} className="!px-5 !py-2.5">
            <PlusIcon className="h-4 w-4" />
            {t('admin.offers.add')}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ${
                offer.is_active === false ? 'opacity-50' : ''
              }`}
            >
              {offer.image ? (
                <img src={offer.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="h-20 w-20 shrink-0 rounded-xl bg-cream-dark" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-gold">
                  {lang === 'ar' ? offer.badge_ar : offer.badge_en}
                </p>
                <p className="truncate font-medium text-lake-950">
                  {lang === 'ar' ? offer.title_ar : offer.title_en}
                </p>
                <p className="line-clamp-2 text-xs text-stone-soft">
                  {lang === 'ar' ? offer.text_ar : offer.text_en}
                </p>
                {offer.code && (
                  <p dir="ltr" className="mt-1 truncate text-xs tracking-widest text-lake-700">
                    {offer.code}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  onClick={() => void onToggleActive(offer)}
                  disabled={toggling === offer.id}
                  aria-label={
                    offer.is_active === false
                      ? t('admin.offers.activate')
                      : t('admin.offers.deactivate')
                  }
                  className={`cursor-pointer rounded-full p-2 hover:bg-lake-50 disabled:opacity-40 ${
                    offer.is_active === false ? 'text-stone-soft' : 'text-emerald-600'
                  }`}
                >
                  {offer.is_active === false ? (
                    <EyeOffIcon className="h-4.5 w-4.5" />
                  ) : (
                    <EyeIcon className="h-4.5 w-4.5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(offer)}
                  aria-label={t('admin.offers.edit')}
                  className="cursor-pointer rounded-full p-2 text-lake-700 hover:bg-lake-50"
                >
                  <EditIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => void onDelete(offer)}
                  aria-label={t('cart.remove')}
                  className="cursor-pointer rounded-full p-2 text-red-500 hover:bg-red-50"
                >
                  <TrashIcon className="h-4.5 w-4.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
