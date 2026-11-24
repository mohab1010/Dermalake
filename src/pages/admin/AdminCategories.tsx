import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { CategoryDoc } from '../../lib/types'
import { DEFAULT_CATEGORIES } from '../../lib/types'
import {
  adminDeleteCategory,
  adminFetchCategories,
  adminSaveCategory,
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
  name_ar: string
  name_en: string
  slug: string
  image: string
  sort: string
}

const empty: FormState = { name_ar: '', name_en: '', slug: '', image: '', sort: '' }

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function AdminCategories() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const toast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<CategoryDoc[] | null>(null)
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
    adminFetchCategories().then(setCategories).catch((err) => setError(errorKey(err, 'common.error')))
  }, [])

  function openNew() {
    setEditingId(null)
    setForm({ ...empty, sort: String((categories?.length ?? 0) + 1) })
    setErrors({})
    setShowForm(true)
  }

  function openEdit(cat: CategoryDoc) {
    setEditingId(cat.id)
    setForm({
      name_ar: cat.name_ar,
      name_en: cat.name_en,
      slug: cat.slug,
      image: cat.image ?? '',
      sort: String(cat.sort ?? 0),
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
      const url = await adminUploadImage(file, 'categories')
      setForm((f) => ({ ...f, image: url }))
    } catch (err) {
      console.error('Category image upload failed:', err)
      toast(t(uploadErrorKey(err)))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Partial<FormState> = {}
    if (!form.name_ar.trim()) next.name_ar = t('admin.form.required')
    if (!form.name_en.trim()) next.name_en = t('admin.form.required')
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name_en)
    const existing = editingId ? categories?.find((c) => c.id === editingId) : undefined
    const input = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      slug: slug || `category-${Date.now().toString(36)}`,
      image: form.image.trim(),
      sort: Number(form.sort) || 0,
      is_active: existing?.is_active ?? true,
    }
    try {
      await adminSaveCategory(input, editingId ?? undefined)
      setCategories(await adminFetchCategories())
      refreshCatalog()
      toast(t('admin.categories.saved'))
      setShowForm(false)
    } catch (err) {
      toast(t(errorKey(err, 'admin.form.saveError')))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(cat: CategoryDoc) {
    const ok = await confirmDialog({ message: t('admin.categories.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await adminDeleteCategory(cat.id)
      setCategories((prev) => prev?.filter((c) => c.id !== cat.id) ?? null)
      refreshCatalog()
      toast(t('admin.categories.deleted'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    }
  }

  async function onToggleActive(cat: CategoryDoc) {
    setToggling(cat.id)
    try {
      const is_active = !(cat.is_active ?? true)
      await adminSaveCategory(
        { slug: cat.slug, name_en: cat.name_en, name_ar: cat.name_ar, image: cat.image, sort: cat.sort, is_active },
        cat.id,
      )
      setCategories((prev) => prev?.map((c) => (c.id === cat.id ? { ...c, is_active } : c)) ?? null)
      refreshCatalog()
      toast(is_active ? t('admin.categories.activated') : t('admin.categories.deactivated'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setToggling(null)
    }
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await adminSaveCategory({
          slug: cat.slug,
          name_en: cat.name_en,
          name_ar: cat.name_ar,
          image: cat.image,
          sort: cat.sort,
          is_active: true,
        })
      }
      setCategories(await adminFetchCategories())
      refreshCatalog()
      toast(t('admin.categories.saved'))
    } catch (err) {
      toast(t(errorKey(err, 'common.error')))
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t('admin.categories.title')}</PageTitle>
        <Button onClick={openNew} className="!px-5 !py-2.5">
          <PlusIcon className="h-4 w-4" />
          {t('admin.categories.add')}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{t(error)}</p>
      )}

      {/* Inline form */}
      {showForm && (
        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">
            {editingId ? t('admin.categories.edit') : t('admin.categories.add')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cf-name-ar" className="mb-1.5 block text-sm font-medium">
                {t('admin.categories.nameAr')}
              </label>
              <input id="cf-name-ar" dir="rtl" value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} className={adminInputError(errors.name_ar)} />
              {errors.name_ar && <p className="mt-1 text-xs text-red-500">{errors.name_ar}</p>}
            </div>
            <div>
              <label htmlFor="cf-name-en" className="mb-1.5 block text-sm font-medium">
                {t('admin.categories.nameEn')}
              </label>
              <input id="cf-name-en" dir="ltr" value={form.name_en} onChange={(e) => set('name_en', e.target.value)} className={`${adminInputError(errors.name_en)} text-start`} />
              {errors.name_en && <p className="mt-1 text-xs text-red-500">{errors.name_en}</p>}
            </div>
            <div>
              <label htmlFor="cf-slug" className="mb-1.5 block text-sm font-medium">
                {t('admin.categories.slug')}
              </label>
              <input
                id="cf-slug"
                dir="ltr"
                disabled={Boolean(editingId)}
                placeholder={slugify(form.name_en)}
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className={`${adminInput} text-start disabled:bg-cream disabled:text-stone-soft`}
              />
            </div>
            <div>
              <label htmlFor="cf-sort" className="mb-1.5 block text-sm font-medium">
                {t('admin.categories.sort')}
              </label>
              <input id="cf-sort" dir="ltr" inputMode="numeric" value={form.sort} onChange={(e) => set('sort', e.target.value)} className={`${adminInput} text-start`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cf-image" className="mb-1.5 block text-sm font-medium">
                {t('admin.categories.image')}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {form.image && (
                  <img src={form.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
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
                  id="cf-image"
                  dir="ltr"
                  placeholder={t('admin.form.orUrl')}
                  value={form.image}
                  onChange={(e) => set('image', e.target.value)}
                  className={`${adminInput} min-w-0 flex-1 text-start`}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={saving || uploading} className="!px-6 !py-2.5">
              {saving ? t('admin.form.saving') : t('admin.form.save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="!px-6 !py-2.5">
              {t('admin.form.cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {error ? null : !categories ? (
        <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 text-center shadow-soft">
          <p className="text-sm text-stone-soft">{t('admin.categories.empty')}</p>
          <Button variant="outline" disabled={seeding} onClick={() => void seedDefaults()}>
            {seeding ? t('admin.form.saving') : t('admin.categories.seedDefaults')}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ${cat.is_active === false ? 'opacity-50' : ''}`}
            >
              {cat.image ? (
                <img src={cat.image} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 rounded-xl bg-cream-dark" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-lake-950">
                  {lang === 'ar' ? cat.name_ar : cat.name_en}
                </p>
                <p className="truncate text-xs text-stone-soft" dir="ltr">
                  {cat.slug}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => void onToggleActive(cat)}
                  disabled={toggling === cat.id}
                  aria-label={cat.is_active === false ? t('admin.categories.activate') : t('admin.categories.deactivate')}
                  className={`cursor-pointer rounded-full p-2 hover:bg-lake-50 disabled:opacity-40 ${
                    cat.is_active === false ? 'text-stone-soft' : 'text-emerald-600'
                  }`}
                >
                  {cat.is_active === false ? (
                    <EyeOffIcon className="h-4.5 w-4.5" />
                  ) : (
                    <EyeIcon className="h-4.5 w-4.5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  aria-label={t('admin.categories.edit')}
                  className="cursor-pointer rounded-full p-2 text-lake-700 hover:bg-lake-50"
                >
                  <EditIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => void onDelete(cat)}
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
