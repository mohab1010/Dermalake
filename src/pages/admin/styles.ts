export const adminInput =
  'w-full rounded-xl border border-lake-900/15 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-lake-500'

export const adminSelect = `${adminInput} cursor-pointer`

export function adminInputError(hasError?: string) {
  return hasError ? adminInput.replace('border-lake-900/15', 'border-red-400') : adminInput
}

export function formatOrderDate(ts: number, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts))
}
