import { useEffect } from 'react'
import { create } from 'zustand'
import { fetchCategories, invalidateCatalogCache } from '../lib/api'
import type { CategoryDoc } from '../lib/types'

interface CatalogState {
  categories: CategoryDoc[] | null
}

export const useCatalog = create<CatalogState>(() => ({ categories: null }))

let loading = false

function load() {
  if (loading) return
  loading = true
  fetchCategories()
    .then((categories) => useCatalog.setState({ categories }))
    .finally(() => {
      loading = false
    })
}

/** Categories from Firestore (null while loading). */
export function useCategories(): CategoryDoc[] | null {
  const categories = useCatalog((s) => s.categories)
  useEffect(() => {
    if (!categories) load()
  }, [categories])
  return categories
}

export function categoryLabel(
  slug: string,
  lang: string,
  categories: CategoryDoc[] | null,
): string {
  const cat = categories?.find((c) => c.slug === slug)
  if (!cat) return slug
  return lang === 'ar' ? cat.name_ar : cat.name_en
}

/** Drop caches and refetch — called after the admin edits the catalog. */
export function refreshCatalog() {
  invalidateCatalogCache()
  useCatalog.setState({ categories: null })
}
