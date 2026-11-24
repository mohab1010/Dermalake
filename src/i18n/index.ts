import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './ar.json'
import en from './en.json'

const STORAGE_KEY = 'dermalake-lang'

const saved = localStorage.getItem(STORAGE_KEY)
const initialLang = saved === 'en' || saved === 'ar' ? saved : 'ar'

export function applyDir(lang: string) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDir(initialLang)

i18n.on('languageChanged', (lang) => {
  localStorage.setItem(STORAGE_KEY, lang)
  applyDir(lang)
})

export default i18n
