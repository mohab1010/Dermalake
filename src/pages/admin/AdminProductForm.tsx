import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorKey } from '../../lib/errors'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { KeyIngredient, Product, SkinType } from '../../lib/types'
import { SKIN_TYPES } from '../../lib/types'
import {
  adminCreateProduct,
  adminFetchProduct,
  adminUpdateProduct,
  adminUploadImage,
  uploadErrorKey,
  type ProductInput,
} from '../../lib/admin-api'
import { categoryLabel, refreshCatalog, useCategories } from '../../store/catalog'
import { useToast } from '../../components/ui/toastStore'
import { Button } from '../../components/ui/Button'
import { CloseIcon, UploadIcon } from '../../components/ui/Icons'
import { PageTitle } from './ui'
import { adminInput, adminInputError, adminSelect } from './styles'

interface FormState {
  name_ar: string
  name_en: string
  slug: string
  description_ar: string
  description_en: string
  category: string
  price: string
  sale_price: string
  stock: string
  images: string[]
  skin_types: SkinType[]
  is_featured: boolean
  is_active: boolean
  ingredients_ar: string
  ingredients_en: string
  how_to_use_ar: string
  how_to_use_en: string
  clinical_benefits_ar: string
  clinical_benefits_en: string
  why_choose_ar: string
  why_choose_en: string
  indications_ar: string
  indications_en: string
  key_ingredients: KeyIngredient[]
}

const emptyIngredient: KeyIngredient = {
  name_en: '',
  name_ar: '',
  concentration: '',
  function_en: '',
  function_ar: '',
}

const empty: FormState = {
  name_ar: '',
  name_en: '',
  slug: '',
  description_ar: '',
  description_en: '',
  category: '',
  price: '',
  sale_price: '',
  stock: '',
  images: [],
  skin_types: ['all'],
  is_featured: false,
  is_active: true,
  ingredients_ar: '',
  ingredients_en: '',
  how_to_use_ar: '',
  how_to_use_en: '',
  clinical_benefits_ar: '',
  clinical_benefits_en: '',
  why_choose_ar: '',
  why_choose_en: '',
  indications_ar: '',
  indications_en: '',
  key_ingredients: [],
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toFormState(p: Product): FormState {
  return {
    name_ar: p.name_ar,
    name_en: p.name_en,
    slug: p.slug,
    description_ar: p.description_ar,
    description_en: p.description_en,
    category: p.category,
    price: String(p.price),
    sale_price: p.sale_price !== null ? String(p.sale_price) : '',
    stock: String(p.stock),
    images: p.images,
    skin_types: p.skin_types,
    is_featured: p.is_featured,
    is_active: p.is_active,
    ingredients_ar: p.ingredients_ar,
    ingredients_en: p.ingredients_en,
    how_to_use_ar: p.how_to_use_ar,
    how_to_use_en: p.how_to_use_en,
    clinical_benefits_ar: p.clinical_benefits_ar ?? '',
    clinical_benefits_en: p.clinical_benefits_en ?? '',
    why_choose_ar: p.why_choose_ar ?? '',
    why_choose_en: p.why_choose_en ?? '',
    indications_ar: p.indications_ar ?? '',
    indications_en: p.indications_en ?? '',
    key_ingredients: p.key_ingredients ?? [],
  }
}

export function AdminProductForm() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)
  const categories = useCategories()
  const toast = useToast((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(empty)
  const [existing, setExisting] = useState<Product | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!id) return
    adminFetchProduct(id)
      .then((p) => {
        if (p) {
          setExisting(p)
          setForm(toFormState(p))
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name_ar.trim()) next.name_ar = t('admin.form.required')
    if (!form.name_en.trim()) next.name_en = t('admin.form.required')
    if (!form.category) next.category = t('admin.form.required')
    const price = Number(form.price)
    if (!form.price || !Number.isFinite(price) || price <= 0) next.price = t('admin.form.invalidNumber')
    if (form.sale_price) {
      const sale = Number(form.sale_price)
      if (!Number.isFinite(sale) || sale <= 0) next.sale_price = t('admin.form.invalidNumber')
      else if (sale >= price) next.sale_price = t('admin.form.salePriceTooHigh')
    }
    const stock = Number(form.stock)
    if (form.stock === '' || !Number.isInteger(stock) || stock < 0) next.stock = t('admin.form.invalidNumber')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onUpload(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      // allSettled, not all: one oversized file in a batch shouldn't discard
      // the images that uploaded fine.
      const results = await Promise.allSettled(
        list.map((file) => adminUploadImage(file, 'products')),
      )
      const urls = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
      if (urls.length > 0) setForm((f) => ({ ...f, images: [...f.images, ...urls] }))

      const failure = results.find((r) => r.status === 'rejected')
      if (failure) {
        console.error('Product image upload failed:', failure.reason)
        setUploadError(uploadErrorKey(failure.reason))
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function addUrl() {
    const url = urlDraft.trim()
    if (!url) return
    setForm((f) => ({ ...f, images: [...f.images, url] }))
    setUrlDraft('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSaveError(null)

    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name_en)
    const input: ProductInput = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      slug: slug || `product-${Date.now().toString(36)}`,
      description_ar: form.description_ar.trim(),
      description_en: form.description_en.trim(),
      category: form.category,
      price: Number(form.price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Number(form.stock),
      images: form.images,
      skin_types: form.skin_types.length > 0 ? form.skin_types : ['all'],
      is_featured: form.is_featured,
      is_active: form.is_active,
      ingredients_ar: form.ingredients_ar.trim(),
      ingredients_en: form.ingredients_en.trim(),
      how_to_use_ar: form.how_to_use_ar.trim(),
      how_to_use_en: form.how_to_use_en.trim(),
      clinical_benefits_ar: form.clinical_benefits_ar.trim(),
      clinical_benefits_en: form.clinical_benefits_en.trim(),
      why_choose_ar: form.why_choose_ar.trim(),
      why_choose_en: form.why_choose_en.trim(),
      indications_ar: form.indications_ar.trim(),
      indications_en: form.indications_en.trim(),
      key_ingredients: form.key_ingredients
        .map((ing) => ({
          name_en: ing.name_en.trim(),
          name_ar: ing.name_ar.trim(),
          concentration: ing.concentration.trim(),
          function_en: ing.function_en.trim(),
          function_ar: ing.function_ar.trim(),
        }))
        .filter((ing) => ing.name_en || ing.name_ar),
      rating: existing?.rating ?? 0,
      reviews_count: existing?.reviews_count ?? 0,
      sales_count: existing?.sales_count ?? 0,
      created_at: existing?.created_at ?? Date.now(),
    }

    try {
      if (editing && id) await adminUpdateProduct(id, input)
      else await adminCreateProduct(input)
      refreshCatalog()
      toast(t('admin.products.saved'))
      navigate('/admin/products')
    } catch (err) {
      setSaveError(errorKey(err, 'admin.form.saveError'))
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-stone-soft">{t('common.loading')}</p>
  }

  const field = (
    key: keyof FormState & string,
    label: string,
    props: Record<string, unknown> = {},
  ) => (
    <div>
      <label htmlFor={`pf-${key}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`pf-${key}`}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        className={adminInputError(errors[key])}
        {...props}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  const area = (key: keyof FormState & string, label: string, rows = 3, dir?: string) => (
    <div>
      <label htmlFor={`pf-${key}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={`pf-${key}`}
        rows={rows}
        dir={dir}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        className={`${adminInput} resize-none ${dir ? 'text-start' : ''}`}
      />
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageTitle>{editing ? t('admin.products.edit') : t('admin.products.add')}</PageTitle>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basics */}
        <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('admin.form.sectionBasic')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('name_ar', t('admin.form.nameAr'), { dir: 'rtl' })}
            {field('name_en', t('admin.form.nameEn'), { dir: 'ltr', className: `${adminInputError(errors.name_en)} text-start` })}
            <div className="sm:col-span-2">
              {field('slug', t('admin.form.slug'), {
                dir: 'ltr',
                placeholder: slugify(form.name_en) || 'my-product',
                className: `${adminInput} text-start`,
              })}
              <p className="mt-1 text-xs text-stone-soft">{t('admin.form.slugHint')}</p>
            </div>
            <div>
              <label htmlFor="pf-category" className="mb-1.5 block text-sm font-medium">
                {t('admin.form.category')}
              </label>
              <select
                id="pf-category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={adminSelect}
              >
                <option value="">—</option>
                {(categories ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {categoryLabel(c.slug, lang, categories)}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
            </div>
            {field('stock', t('admin.form.stock'), { inputMode: 'numeric', dir: 'ltr' })}
            {field('price', t('admin.form.price'), { inputMode: 'decimal', dir: 'ltr' })}
            {field('sale_price', t('admin.form.salePrice'), { inputMode: 'decimal', dir: 'ltr' })}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => set('is_featured', e.target.checked)}
                className="h-4 w-4 accent-lake-700"
              />
              {t('admin.form.featured')}
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 accent-lake-700"
              />
              {t('admin.form.active')}
            </label>
          </div>
        </fieldset>

        {/* Images */}
        <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('admin.form.sectionImages')}</h2>

          {form.images.length === 0 ? (
            <p className="mb-4 rounded-xl bg-cream px-4 py-3 text-sm text-stone-soft">
              {t('admin.form.noImages')}
            </p>
          ) : (
            <ul className="mb-4 flex flex-wrap gap-3">
              {form.images.map((url, i) => (
                <li key={`${url}-${i}`} className="relative">
                  <img src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
                    }
                    className="absolute -top-2 -end-2 cursor-pointer rounded-full bg-lake-900 p-1 text-cream shadow-soft hover:bg-red-500"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) void onUpload(e.target.files)
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
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                dir="ltr"
                placeholder={t('admin.form.orUrl')}
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addUrl()
                  }
                }}
                className={`${adminInput} text-start`}
              />
              <Button type="button" variant="ghost" onClick={addUrl} className="!px-4 !py-2.5">
                {t('admin.form.addUrl')}
              </Button>
            </div>
          </div>
          {uploadError && <p className="mt-3 text-xs text-red-500">{t(uploadError)}</p>}
        </fieldset>

        {/* Details */}
        <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-5 text-xl text-lake-950">{t('admin.form.sectionDetails')}</h2>
          <div className="grid grid-cols-1 gap-4">
            {area('description_ar', t('admin.form.descAr'), 3, 'rtl')}
            {area('description_en', t('admin.form.descEn'), 3, 'ltr')}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {area('ingredients_ar', t('admin.form.ingredientsAr'), 2, 'rtl')}
              {area('ingredients_en', t('admin.form.ingredientsEn'), 2, 'ltr')}
              {area('how_to_use_ar', t('admin.form.howToUseAr'), 2, 'rtl')}
              {area('how_to_use_en', t('admin.form.howToUseEn'), 2, 'ltr')}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{t('admin.form.skinTypes')}</p>
              <div className="flex flex-wrap gap-2">
                {SKIN_TYPES.map((s) => {
                  const active = form.skin_types.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        set(
                          'skin_types',
                          active
                            ? form.skin_types.filter((x) => x !== s)
                            : [...form.skin_types, s],
                        )
                      }
                      className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-lake-900 text-cream'
                          : 'bg-cream text-lake-950 hover:bg-lake-50'
                      }`}
                    >
                      {t(`skinTypes.${s}`)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Leaflet — clinical benefits, why choose, key active ingredients, indications */}
        <fieldset className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="font-display mb-1 text-xl text-lake-950">{t('admin.form.sectionLeaflet')}</h2>
          <p className="mb-5 text-xs text-stone-soft">{t('admin.form.leafletHint')}</p>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {area('clinical_benefits_ar', t('admin.form.clinicalBenefitsAr'), 4, 'rtl')}
              {area('clinical_benefits_en', t('admin.form.clinicalBenefitsEn'), 4, 'ltr')}
              {area('why_choose_ar', t('admin.form.whyChooseAr'), 3, 'rtl')}
              {area('why_choose_en', t('admin.form.whyChooseEn'), 3, 'ltr')}
              {area('indications_ar', t('admin.form.indicationsAr'), 2, 'rtl')}
              {area('indications_en', t('admin.form.indicationsEn'), 2, 'ltr')}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t('admin.form.keyIngredients')}</p>
              {form.key_ingredients.length === 0 && (
                <p className="mb-3 rounded-xl bg-cream px-4 py-3 text-sm text-stone-soft">
                  {t('admin.form.noKeyIngredients')}
                </p>
              )}
              <div className="space-y-3">
                {form.key_ingredients.map((ing, i) => {
                  const update = (patch: Partial<KeyIngredient>) =>
                    set(
                      'key_ingredients',
                      form.key_ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                    )
                  return (
                    <div key={i} className="relative grid gap-2 rounded-xl bg-cream p-3 sm:grid-cols-2">
                      <input
                        dir="rtl"
                        placeholder={t('admin.form.ingNameAr')}
                        value={ing.name_ar}
                        onChange={(e) => update({ name_ar: e.target.value })}
                        className={adminInput}
                      />
                      <input
                        dir="ltr"
                        placeholder={t('admin.form.ingNameEn')}
                        value={ing.name_en}
                        onChange={(e) => update({ name_en: e.target.value })}
                        className={`${adminInput} text-start`}
                      />
                      <input
                        dir="ltr"
                        placeholder={t('admin.form.ingConcentration')}
                        value={ing.concentration}
                        onChange={(e) => update({ concentration: e.target.value })}
                        className={`${adminInput} text-start sm:col-span-2`}
                      />
                      <input
                        dir="rtl"
                        placeholder={t('admin.form.ingFunctionAr')}
                        value={ing.function_ar}
                        onChange={(e) => update({ function_ar: e.target.value })}
                        className={adminInput}
                      />
                      <input
                        dir="ltr"
                        placeholder={t('admin.form.ingFunctionEn')}
                        value={ing.function_en}
                        onChange={(e) => update({ function_en: e.target.value })}
                        className={`${adminInput} text-start`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          set('key_ingredients', form.key_ingredients.filter((_, j) => j !== i))
                        }
                        aria-label={t('admin.form.removeIngredient')}
                        className="absolute -top-2 -end-2 cursor-pointer rounded-full bg-lake-900 p-1 text-cream shadow-soft hover:bg-red-500"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => set('key_ingredients', [...form.key_ingredients, { ...emptyIngredient }])}
                className="mt-3 !px-5 !py-2.5"
              >
                {t('admin.form.addIngredient')}
              </Button>
            </div>
          </div>
        </fieldset>

        {saveError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {t(saveError)}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? t('admin.form.saving') : t('admin.form.save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
            {t('admin.form.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
