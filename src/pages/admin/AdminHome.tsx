import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { HomeSlide } from '../../lib/types'
import {
  adminDeleteHomeSlide,
  adminFetchHomeSlides,
  adminSaveHomeSlide,
  adminSeedHomeSlides,
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
  tag_ar: string
  tag_en: string
  title_ar: string
  title_en: string
  text_ar: string
  text_en: string
  link: string
  sort: string
}

const empty: FormState = {
  image: '',
  tag_ar: '',
  tag_en: '',
  title_ar: '',
  title_en: '',
  text_ar: '',
  text_en: '',
  link: '/shop',
  sort: '',
}

export function AdminHome() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const toast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)

  const [slides, setSlides] = useState<HomeSlide[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    adminFetchHomeSlides().then(setSlides).catch((err) => setError(errorKey(err, 'common.error')))
  }, [])

  function openNew() {
    setEditingId(null)
    setForm({ ...empty, sort: String((slides?.length ?? 0) + 1) })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(slide: HomeSlide) {
    setEditingId(slide.id)
    setForm({
      image: slide.image ?? '',
      tag_ar: slide.tag_ar ?? '',
      tag_en: slide.tag_en ?? '',
      title_ar: slide.title_ar ?? '',
      title_en: slide.title_en ?? '',
      text_ar: slide.text_ar ?? '',
      text_en: slide.text_en ?? '',
      link: slide.link ?? '/shop',
      sort: String(slide.sort ?? 0),
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
      const url = await adminUploadImage(file, 'home')
      setForm((f) => ({ ...f, image: url }))
    } catch (err) {
      console.error('Home slide image upload failed:', err)
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
    const existing = editingId ? slides?.find((s) => s.id === editingId) : undefined
    try {
      await adminSaveHomeSlide(
        {
          image: form.image.trim(),
          tag_ar: form.tag_ar.trim(),
          tag_en: form.tag_en.trim(),
          title_ar: form.title_ar.trim(),
          title_en: form.title_en.trim(),
          text_ar: form.text_ar.trim(),
          text_en: form.text_en.trim(),
          link: form.link.trim() || '/shop',
          sort: Number(form.sort) || 0,
          is_active: existing?.is_active ?? true,
        },
        editingId ?? undefined,
      )
      setSlides(await adminFetchHomeSlides())
      refreshCatalog()
      toast(t('admin.home.saved'))
      setShowForm(false)
    } catch (err) {
      toast(t(errorKey(err, 'admin.form.saveError')))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(slide: HomeSlide) {
    const ok = await confirmDialog({ message: t('admin.home.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await adminDeleteHomeSlide(slide.id)
      setSlides((prev) => prev?.filter((s) => s.id !== slide.id) ?? null)
      refreshCatalog()
      toast(t('admin.home.deleted'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    }
  }

  async function onToggleActive(slide: HomeSlide) {
    setToggling(slide.id)
    try {
      const is_active = !(slide.is_active ?? true)
      const { id: _id, ...rest } = slide
      await adminSaveHomeSlide({ ...rest, is_active }, slide.id)
      setSlides((prev) => prev?.map((s) => (s.id === slide.id ? { ...s, is_active } : s)) ?? null)
      refreshCatalog()
      toast(is_active ? t('admin.home.activated') : t('admin.home.deactivated'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setToggling(null)
    }
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      await adminSeedHomeSlides()
      setSlides(await adminFetchHomeSlides())
      refreshCatalog()
      toast(t('admin.home.saved'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setSeeding(false)
    }
  }

  const textField = (
    key: keyof FormState,
    label: string,
    dir: 'rtl' | 'ltr',
    className = '',
  ) => (
    <div className={className}>
      <label htmlFor={`hf-${key}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`hf-${key}`}
        dir={dir}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={`${adminInputError(errors[key])} ${dir === 'ltr' ? 'text-start' : ''}`}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle>{t('admin.home.title')}</PageTitle>
          <p className="mt-1 text-sm text-stone-soft">{t('admin.home.subtitle')}</p>
        </div>
        <Button onClick={openNew} className="!px-5 !py-2.5">
          <PlusIcon className="h-4 w-4" />
          {t('admin.home.add')}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{t(error)}</p>
      )}

      {/* Inline form */}
      {showForm && (
        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">
            {editingId ? t('admin.home.edit') : t('admin.home.add')}
          </h2>

          {/* Image */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">{t('admin.home.image')}</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.image && (
                <img src={form.image} alt="" className="h-24 w-20 rounded-xl object-cover" />
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
            {textField('title_ar', t('admin.home.titleAr'), 'rtl')}
            {textField('title_en', t('admin.home.titleEn'), 'ltr')}
            {textField('tag_ar', t('admin.home.tagAr'), 'rtl')}
            {textField('tag_en', t('admin.home.tagEn'), 'ltr')}
            {textField('text_ar', t('admin.home.textAr'), 'rtl')}
            {textField('text_en', t('admin.home.textEn'), 'ltr')}
            {textField('link', t('admin.home.link'), 'ltr')}
            {textField('sort', t('admin.home.sort'), 'ltr')}
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
      {error ? null : !slides ? (
        <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">{t('admin.home.empty')}</p>
          <Button variant="outline" disabled={seeding} onClick={() => void seedDefaults()}>
            {seeding ? t('admin.form.saving') : t('admin.home.seedDefaults')}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <li
              key={slide.id}
              className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ${
                slide.is_active === false ? 'opacity-50' : ''
              }`}
            >
              {slide.image ? (
                <img src={slide.image} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="h-20 w-16 shrink-0 rounded-xl bg-cream-dark" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-gold">
                  {lang === 'ar' ? slide.tag_ar : slide.tag_en}
                </p>
                <p className="truncate font-medium text-lake-950">
                  {lang === 'ar' ? slide.title_ar : slide.title_en}
                </p>
                <p className="line-clamp-2 text-xs text-stone-soft">
                  {lang === 'ar' ? slide.text_ar : slide.text_en}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  onClick={() => void onToggleActive(slide)}
                  disabled={toggling === slide.id}
                  aria-label={
                    slide.is_active === false ? t('admin.home.activate') : t('admin.home.deactivate')
                  }
                  className={`cursor-pointer rounded-full p-2 hover:bg-lake-50 disabled:opacity-40 ${
                    slide.is_active === false ? 'text-stone-soft' : 'text-emerald-600'
                  }`}
                >
                  {slide.is_active === false ? (
                    <EyeOffIcon className="h-4.5 w-4.5" />
                  ) : (
                    <EyeIcon className="h-4.5 w-4.5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(slide)}
                  aria-label={t('admin.home.edit')}
                  className="cursor-pointer rounded-full p-2 text-lake-700 hover:bg-lake-50"
                >
                  <EditIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => void onDelete(slide)}
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
